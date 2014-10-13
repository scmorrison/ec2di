/*eslint-env node */

"use strict";

var Promise = require("bluebird"),
    AWS = require("aws-sdk"),
    path = require("path");

var ini = Promise.promisifyAll(require("ini")),
    fs = Promise.promisifyAll(require("fs-extra"));

AWS.config.apiVersion = "2014-06-15";

// Construct Ec2di()
function ec2di() {

  var emptyInventory = function() {
    //Create an empty inventory
    var inventory = {
      "_meta": {
        "hostvars": {}
      }
    };

    return inventory;
  };

  var getServiceRegions = function(service) {
    return new Promise(function(resolve, reject) {
      var endpointFile = path.join(__dirname, "/../json/endpoints.json");
      // Grab the contents of endpoints.json
      fs.readFileAsync(endpointFile, "utf8").then(JSON.parse)
        .then(function(json) {
          // Return all regions for service type
          resolve(json.services[service]);
        })
        .catch(function(e) {
          reject(e);
        });
    });
  };

  var filterRegions = function(regions, configRegions, configRegionsExclude) {
    return new Promise(function(resolve) {
      var filteredRegions = [];
      if (configRegions === "all") {
        regions.forEach(function(region) {
          if (configRegionsExclude.indexOf(region) < 0) {
            filteredRegions.push(region);
          }
        });
      } else {
        filteredRegions = configRegions.split(",");
      }
      resolve(filteredRegions);
    });
  };

  var readSettings = function() {
    return new Promise(function(resolve, reject) {
      // Read ec2.ini and parse with ini
      fs.readFileAsync("./ec2.ini", "utf-8")
        .then(function(config) {
          return ini.parse(config);
        })
        .then(function(config) {

          // Map config attributes to settings
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
            settings.patternInclude = '';
          }

          //Do we need to exclude hosts that match a pattern?
          var patternExclude = config.ec2.pattern_exclude;
          if (patternExclude && patternExclude.length > 0) {
            settings.patternExclude = new RegExp(patternExclude);
          } else {
            settings.patternExclude = '';
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

        })
        .then(function(settings) {
          // Make sure the cache / tmp dir exists
          return fs.ensureDirAsync(settings.cacheDir).then(function() {
            return settings;
          });
        })
        .then(function(settings) {
          // Filter out only regions specified in the config file
          settings.ec2regions = [];
          getServiceRegions("ec2").then(function(regions) {
            filterRegions(regions, settings.configRegions, settings.configRegionsExclude)
              .then(function(regions) {
                console.log(regions);
                //settings.ec2regions = regions;
                resolve(settings);
              });
          });
        }).catch(function(e) {
          reject(e);
        });
    });

  };

  /*
    var isCacheValid = function() {

        console.log("Is cache valid");

    };

    var doApiCallsUpdateCache = function() {

        console.log("Refreshing cache");

    };

    var getInstancesByRegion = function() {

        console.log("Get instances by region ");

    };

    var getRdsInstancesByRegion = function() {

        console.log("Get RDS instances by region ");

    };

    var getInstance = function(instanceid) {

        //var action = options.action !== undefined ? options.action : "nothing "
        //var instanceId = options.instanceId !== undefined ? options.instanceId : ""

        console.log("Get instance: " + instanceid);

    };

    var addInstance = function() {

        console.log("Add instance ");

    };

    var addRdsInstance = function() {

        console.log("Add RDS instance ");

    };

    var getRoute53Records = function() {

        console.log("Get Route 53 records ");

    };

    var getInstanceRoute53Names = function() {

        console.log("Get instance Route 53 records ");

    };

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
  var inventory = emptyInventory();

  //Index of hostname(address) to instance ID
  //var index = {};

  //var regions = [];

  // Read settings and parse CLI arguments
  var settings = readSettings().then(function(settings) {
    console.log(settings);
    return settings;
  });

  if (inventory) {
    var dataToPrint = inventory;
  } else {
    dataToPrint = {
      "_meta": {
        "hostvars": {
          "somehost": "123.456.789.0"
        }
      }
    };

  }

  return {
    inventory: dataToPrint,
    getServiceRegions: getServiceRegions,
    settings: settings
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
module.exports = ec2di();
