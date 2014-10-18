/*eslint-env node */

"use strict";

var Promise = require("bluebird"),
  AWS = require("aws-sdk"),
  path = require("path"),
  moment = require("moment");

var ini = Promise.promisifyAll(require("ini")),
  fs = Promise.promisifyAll(require("fs-extra"));
//    AWS = Promise.promisifyAll(require("aws-sdk"));

var config = ini.parse(fs.readFileSync("./ec2.ini", "utf-8"));

AWS.config.apiVersion = "2014-06-15";
AWS.config.region = "eu-west-1";

// Construct Ec2di()
var ec2di = function(configFile) {

  var self = {};
  var settings = [];

  var _emptyInventory = function() {
    //Create an empty inventory
    var inventory = {
      "_meta": {
        "hostvars": {}
      }
    };
    return inventory;
  };

  var _getServiceRegions = function(service) {
    return new Promise(function(resolve, reject) {
      var endpointsFile = path.join(__dirname, "/../json/endpoints.json");
      var endpoints = JSON.parse(fs.readFileSync(endpointsFile, "utf8"));
      resolve(endpoints.services[service]);
    });
  }

  var _filterRegions = function(regions) {
    return new Promise(function(resolve, reject) {
      var filteredRegions = [];
      if (settings.configRegions === "all") {
        regions.forEach(function(region) {
          if (settings.configRegionsExclude.indexOf(region) < 0) {
            filteredRegions.push(region);
          }
        });
      } else {
        filteredRegions = settings.configRegions.split(",");
      }
      resolve(filteredRegions);
    });
  };

  var _getRegions = function() {
    return new Promise(function(resolve, reject) {
      _getServiceRegions("ec2").then(function(regions) {
        _filterRegions(regions).then(function(regions) {
          resolve(regions);
        });
      });
    });
  };

  var _readSettings = function(config) {
    // Read ec2.ini and parse with ini

    var settings = [];
    // Destination addresses
    settings.destinationVariable = config.ec2.destination_variable;
    settings.vpcDestinationVariable = config.ec2.vpc_destination_variable;

    // Route53
    settings.route53Enabled = (config.ec2.route53 === "True");
    settings.route53ExcludedZones = [];
    if (config.ec2.route53_excluded_zones) {
      settings.route53ExcludedZones = config.ec2.route53_excluded_zones.split(",");
    }

    // Include RDS instances?
    settings.rdsEnabled = true;
    if (config.ec2.rds) {
      settings.rdsEnabled = config.ec2.rds;
    }

    // Return all EC2 and RDS instances (if RDS is enabled)
    if (config.ec2.all_instances) {
      settings.allInstances = (config.ec2.all_instances === "True");
    } else {
      settings.allInstances = false;
    }

    if (config.ec2.all_rds_instances && settings.rdsEnabled) {
      settings.allRdsInstances = (config.ec2.all_rds_instances === "True");
    } else {
      settings.allRdsInstances = false;
    }

    // Cache related
    var homedir = (process.platform === "win32") ? process.env.HOMEPATH : process.env.HOME + "/";
    var cachePath = config.ec2.cache_path.replace("~/", homedir);
    settings.cacheDir = path.join(cachePath);
    settings.cachePathCache = settings.cacheDir + "/ansible-ec2.cache";
    settings.cachePathIndex = settings.cacheDir + "/ansible-ec2.index";
    settings.cacheMaxAge = config.ec2.cache_max_age;
    // Make sure the cache / tmp dir exists
    fs.ensureDirAsync(settings.cacheDir).catch(function(e) {
      console.log(e);
    });

    // Regions
    settings.configRegions = config.ec2.regions;
    settings.configRegionsExclude = config.ec2.regions_exclude;

    // Configure nested groups instead of flat namespace.
    if (config.ec2.nested_groups) {
      settings.nestedGroups = (config.ec2.nested_groups === "True");
    } else {
      settings.nestedGroups = false;
    }

    //Do we need to just include hosts that match a pattern?
    var patternInclude = config.ec2.pattern_include;
    if (patternInclude && patternInclude.length > 0) {
      settings.patternInclude = new RegExp(patternInclude);
    } else {
      settings.patternInclude = "";
    }

    //Do we need to exclude hosts that match a pattern?
    var patternExclude = config.ec2.pattern_exclude;
    if (patternExclude && patternExclude.length > 0) {
      settings.patternExclude = new RegExp(patternExclude);
    } else {
      settings.patternExclude = "";
    }

    // Instance filters (see boto and EC2 API docs)
    settings.ec2InstanceFilters = [];
    if (config.ec2.instance_filters) {
      config.ec2.instance_filters.split(",").forEach(function(filter) {
        // refactor this later with destructuring when available.
        var obj = {};
        var tup = filter.split("=");
        obj[tup[0]] = tup[1];
        settings.ec2InstanceFilters.push(obj);
      });
    }

    return settings;

  };

  var _isCacheValid = function() {
    return new Promise(function(resolve, reject) {
      // Check to see if the file exists
      fs.existsAsync(settings.cachePathCache)
        .catch(function(e) {
          // fs.existsAsync throws an error for true, pass it along
          return true;
        })
        .then(function(exists) {
          if (exists) {
            // Get the current time in unix format
            var currentTime = moment().format("X");
            // Lookup the cache file stats to query its mod time
            fs.statAsync(settings.cachePathCache).then(function(stats) {
              // FileExpireTime is the file mod time + cacheMaxAge as defined in the ini in seconds
              var fileExpireTime = moment(stats.mtime).add(settings.cacheMaxAge, "s").format("X");
              if (fileExpireTime > currentTime) {
                // The cache hasn't expired yet
                resolve(true);
              } else {
                // Cache has expired
                resolve(false);
              }
            })
          } else {
            // No file found, return false
            resolve(false);
          }
        });
    });
  };

  var doApiCallsUpdateCache = function() {
    return new Promise(function(resolve, reject) {

      var instances = [];
      var route53records = [];

      if (settings.route53Enabled) {
        _getRoute53Records().then(function(records) {
          route53records.push(records);
        });
      };

      /*_getRegions().then(function(regions) {
        // loop regions and find instances for each region
        regions.forEach(region) {
          _getInstancesByRegion(region).then(function(ec2Instances) {
            instances.push(ec2Instances);
            if (settings.rdsEnabled) {
              _getRdsInstancesByRegion(region).then(function(rdsInstances) {
                instances.push(rdsInstances);
              });
              return instances;
            }
            return instances;
          });
        };
      }).then(function(instances) {
        _writeToCache(instances, settings.cachePathCache);
        _writeToCache(index, settings.cachePathIndex);
      });*/

    });
  };

  /*
    var getInstancesByRegion = function() {

      console.log("Get instances by region ");

    };

    var getRdsInstancesByRegion = function() {

      console.log("Get RDS instances by region ");

    };
  */

  var getInstance = function(instanceid) {
    // Return inventory JSON for single instance
    return new Promise(function(resolve, reject) {
      //var action = options.action !== undefined ? options.action : "nothing "
      //var instanceId = options.instanceId !== undefined ? options.instanceId : ""
      resolve("Get instance: " + instanceid);
    });
  };

  /*
      var addInstance = function() {

          console.log("Add instance ");

      };

      var addRdsInstance = function() {

          console.log("Add RDS instance ");

      };
*/

  var _filteredZones = function(zones) {
    // Filter out any excluded zones defined in the ini file
    var filteredZones = [];
    zones.forEach(function(zone) {
      if (settings.route53ExcludedZones.indexOf(zone.Name.replace(/\.$/, "")) < 0) {
        filteredZones.push(zone);
      }
    });
    return filteredZones;
  };

  var _getRoute53Records = function() {
    var route53 = new AWS.Route53();
    var allZones = Promise.promisify(route53.listHostedZones.bind(route53));
    var allRrSets = Promise.promisify(route53.listResourceRecordSets.bind(route53));
    var route53_zones = [];
    var rrsets = [];
    var route53_records = {};
    return new Promise(function(resolve, reject) {
      allZones().then(function(zones) {
        return zones.HostedZones;
      }).then(function(zones) {
        return _filteredZones(zones);
      }).then(function(zones) {
        return Promise.map(zones, function(zone) {
          var params = {
            HostedZoneId: zone.Id
          }
          return allRrSets(params).then(function(data) {
            zone.ResourceRecordSets = data.ResourceRecordSets;
            return zone;
          });
        });
      }).then(function(zones) {
        resolve(zones);
      }).catch(function(e) {
        reject(e);
      });
    });
  };

  var getInstanceRoute53Names = function() {

    console.log("Get instance Route 53 records ");

  };
  /*
        var getHostInfoDictFromInstance = function() {

            console.log("Get host info dict from instance ");

        };

        var getHostInfo = function() {

            console.log("Get host info ");

        };

        var push = function() {

            console.log("Push ");

        };

        var pushGroup = function() {

            console.log("Push group ");

        };

        var getInventoryFromCache = function() {

            console.log("Get inventory from cache ");

        };

        var loadIndexFromCache = function() {

            console.log("Load index from cache ");

        };

        var writeToCache = function() {

            console.log("Write to cache ");

        };

        var toSafe = function() {

            console.log("To safe ");

        };

        var jsonFormatDict = function() {

            console.log("JSON format dict ");

        };
    */


  // Start with an empty inventory hash
  var inventory = _emptyInventory();
  var dataToPrint;

  //Index of hostname(address) to instance ID
  //var index = {};

  //var regions = [];

  var settings = _readSettings(config);

  _isCacheValid().then(function(valid) {
    console.log(valid);
  });

  //console.log(settings);

  //var regions = getServiceRegions("ec2");
  //console.log(regions);

  var regions = _getRegions().then(function(regions) {
    console.log(regions);
  });

  if (inventory) {
    dataToPrint = inventory;
  } else {
    dataToPrint = {
      "_meta": {
        "hostvars": {
          "somehost": "123.456.789.0"
        }
      }
    };

  }

  _getRoute53Records().then(function(zones) {
    zones.forEach(function(zone) {
      //console.log(zone.Id + ": " + zone.Name);
      zone.ResourceRecordSets.forEach(function(rrset) {
        console.log(rrset);
      });
    });
  });

  return {
    inventory: dataToPrint,
    doApiCallsUpdateCache: doApiCallsUpdateCache,
    getInstance: getInstance
  };

}

/*new AWS.EC2().describeInstances(function(error, data) {
  if (error) {
    console.log(error) // an error occurred
  } else {
    console.log(data) // request succeeded
  }
})*/

// Export Ec2di()
module.exports = ec2di;
