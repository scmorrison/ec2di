/* jslint-env node */

"use strict";

var Promise = require("bluebird"),
  AWS = require("aws-sdk"),
  path = require("path"),
  moment = require("moment"),
  changeCase = require('change-case');

var ini = Promise.promisifyAll(require("ini")),
  fs = Promise.promisifyAll(require("fs-extra"));

AWS.config.apiVersion = "2014-06-15";
AWS.config.region = "eu-west-1";

// AWS promisified methods
var route53 = new AWS.Route53();
var allZones = Promise.promisify(route53.listHostedZones.bind(route53));
var allRrSets = Promise.promisify(route53.listResourceRecordSets.bind(route53));
var ec2 = new AWS.EC2();
var describeInstances = Promise.promisify(ec2.describeInstances.bind(ec2));

var config = ini.parse(fs.readFileSync("./ec2.ini", "utf-8"));

// Construct Ec2di()
var ec2di = function() {

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
      var endpoints_file = path.join(__dirname, "/../json/endpoints.json");
      var endpoints = JSON.parse(fs.readFileSync(endpoints_file, "utf8"));
      resolve(endpoints.services[service]);
    });
  };

  var _filterRegions = function(regions) {
    var filtered_regions = [];
    if (settings.config_regions === "all") {
      regions.forEach(function(region) {
        if (settings.config_regions_exclude.indexOf(region) < 0) {
          filtered_regions.push(region);
        }
      });
    } else {
      filtered_regions = settings.config_regions.split(",");
    }
    return filtered_regions;
  };

  var _getRegions = function() {
    return new Promise(function(resolve, reject) {
      _getServiceRegions("ec2").then(function(regions) {
        resolve(_filterRegions(regions));
      });
    });
  };

  var _readSettings = function(config) {
    // Read ec2.ini and parse with ini

    var settings = [];
    // Destination addresses
    settings.destination_variable = config.ec2.destination_variable;
    settings.vpc_destination_variable = config.ec2.vpc_destination_variable;

    // Route53
    settings.route53_enabled = (config.ec2.route53 === "True");
    settings.route53_excluded_zones = [];
    if (config.ec2.route53_excluded_zones) {
      settings.route53_excluded_zones = config.ec2.route53_excluded_zones.split(",");
    }

    // Include RDS instances?
    settings.rds_enabled = true;
    if (config.ec2.rds) {
      settings.rds_enabled = config.ec2.rds;
    }

    // Return all EC2 and RDS instances (if RDS is enabled)
    if (config.ec2.all_instances) {
      settings.all_instances = (config.ec2.all_instances === "True");
    } else {
      settings.all_instances = false;
    }

    if (config.ec2.all_rds_instances && settings.rds_enabled) {
      settings.all_rds_instances = (config.ec2.all_rds_instances === "True");
    } else {
      settings.all_rds_instances = false;
    }

    // Cache related
    var homedir = (process.platform === "win32") ? process.env.HOMEPATH : process.env.HOME + "/";
    var cache_path = config.ec2.cache_path.replace("~/", homedir);
    settings.cache_dir = path.join(cache_path);
    settings.cache_path_cache = settings.cache_dir + "/ansible-ec2.cache";
    settings.cache_path_index = settings.cache_dir + "/ansible-ec2.index";
    settings.cache_max_age = config.ec2.cache_max_age;
    // Make sure the cache / tmp dir exists
    fs.ensureDirAsync(settings.cache_dir).catch(function(e) {
      console.log(e);
    });

    // Regions
    settings.config_regions = config.ec2.regions;
    settings.config_regions_exclude = config.ec2.regions_exclude;

    // Configure nested groups instead of flat namespace.
    if (config.ec2.nested_groups) {
      settings.nested_groups = (config.ec2.nested_groups === "True");
    } else {
      settings.nested_groups = false;
    }

    //Do we need to just include hosts that match a pattern?
    var pattern_include = config.ec2.pattern_include;
    if (pattern_include && pattern_include.length > 0) {
      settings.pattern_include = pattern_include; //new RegExp(pattern_include);
    } else {
      settings.pattern_include = "";
    }

    //Do we need to exclude hosts that match a pattern?
    var pattern_exclude = config.ec2.pattern_exclude;
    if (pattern_exclude && pattern_exclude.length > 0) {
      settings.pattern_exclude = pattern_include; //new RegExp(pattern_exclude);
    } else {
      settings.pattern_exclude = "";
    }

    // Instance filters (see boto and EC2 API docs)
    settings.ec2_instance_filters = [];
    if (config.ec2.instance_filters) {
      config.ec2.instance_filters.split(",").forEach(function(filter) {
        // refactor this later with destructuring when available.
        var obj = {};
        var tup = filter.split("=");
        obj[tup[0]] = tup[1];
        settings.ec2_instance_filters.push(obj);
      });
    }

    return settings;

  };

  var _isCacheValid = function() {
    return new Promise(function(resolve, reject) {
      // Check to see if the file exists
      fs.existsAsync(settings.cache_path_cache)
        .catch(function(e) {
          // fs.existsAsync throws an error for true, pass it along
          return true;
        })
        .then(function(exists) {
          if (exists) {
            // Get the current time in unix format
            var current_time = moment().format("X");
            // Lookup the cache file stats to query its mod time
            fs.statAsync(settings.cache_path_cache).then(function(stats) {
              // FileExpireTime is the file mod time + cache_max_age as defined in the ini in seconds
              var file_expire_time = moment(stats.mtime).add(settings.cache_max_age, "s").format("X");
              if (file_expire_time > current_time) {
                // The cache hasn't expired yet
                resolve(true);
              } else {
                // Cache has expired
                resolve(false);
              }
            });
          } else {
            // No file found, return false
            resolve(false);
          }
        });
    });
  };


  var _doApiCallsUpdateCache = function() {
    return new Promise(function(resolve, reject) {
      // Do API calls to each region, and save data in cache files

      var route53_records = [];

      // are we going to need route53_records?
      // next, return valid regions for the next step
      _useRoute53RecordsCheck()
        .then(function() {
          // Determine which regions we need to pay attention to
          return _getRegions();
        }).each(function(region) {
          // Collect all Ec2 instances for required regions
          resolve(_getEc2InstancesByRegion(region));
        }).catch(function(e) {
          console.log(e);
        });

      /*_getRegions().then(function(regions) {
        // loop regions and find instances for each region
        regions.forEach(region) {
          _getInstancesByRegion(region).then(function(ec2Instances) {
            instances.push(ec2Instances);
            if (settings.rds_enabled) {
              _getRdsInstancesByRegion(region).then(function(rdsInstances) {
                instances.push(rdsInstances);
              });
              return instances;
            }
            return instances;
          });
        };
      }).then(function(instances) {
        _writeToCache(instances, settings.cache_path_cache);
        _writeToCache(index, settings.cache_path_index);
      });*/
    });
  };

  var _printInventory = function() {
    // Return the latest version of the fully expanded inventory 
    // object regardless of state.
    return JSON.stringify(inventory, null, 2);
  };

  var getInventory = function() {
    return new Promise(function(resolve, reject) {
      _isCacheValid().then(function(valid) {
        // Check to see if we have a valid inventory cache
        if (valid) {
          // Yes, valid, then print
          resolve(_printInventory());
        } else {
          // not valid, re-cache inventory then print
          _doApiCallsUpdateCache().then(function() {
            resolve(_printInventory());
          });
        }
      });
    });
  };


  var _getAllEc2Instances = Promise.method(function(regions) {
    // Collect all ec2 instances for all regions
    Promise.map(regions, function(region) {
      return _getEc2InstancesByRegion(region);
    }).then(function() {
      //console.log(inventory);
      return inventory;
    });
  });

  var _getEc2InstancesByRegion = Promise.method(function(region) {
    // Get ec2 instances for specific region

    var reservations = [];
    var instances = [];
    var self = this;
    var params = {
      Filters: [{}]
    };

    if (settings.ec2_instance_filters) {
      // We need settings.ec2_instance_filters before continuing.
      settings.ec2_instance_filters.forEach(function(filter) {
        var keys = Object.keys(filter);
        var filter_value = filter[keys[0]];
        // Populate params.Filters
        params.Filters.push({
          Name: keys[0],
          Values: [filter_value]
        });
      });
    }

    // Request instances (AWS API)
    return describeInstances(params).then(function(data) {
      data.Reservations.forEach(function(reservation) {
        // The Reservations object contains instance details
        reservation.Instances.forEach(function(instance) {
          instances.push(instance);
          _addInstanceToInventory(instance, region);
        });
      });
    }).then(function() {
      return instances;
    });
  });

  /*var _getRdsInstancesByRegion = function() {

    console.log("Get RDS instances by region ");

  };*/

  var getInstance = function(instanceid) {
    // Return inventory JSON for single instance
    return new Promise(function(resolve, reject) {
      //var action = options.action !== undefined ? options.action : "nothing "
      //var instanceId = options.instanceId !== undefined ? options.instanceId : ""
      resolve("Get instance: " + instanceid);
    });
  };


  var _addInstanceToInventory = function(instance, region) {
    //console.log(JSON.stringify(instance, null, 4));
    // Adds an instance to the inventory and index, as long as it is addressable
    var dest = "";

    if (!settings.all_instances && instance.State.Name !== "running") {
      return;
    }

    if (instance.SubnetId) {

      /*
          For server inside a VPC, using DNS names may not make sense. When an instance
          has 'subnet_id' set, this variable is used.If the subnet is public, setting
          this to 'ip_address' will return the public IP address. For instances in a
          private subnet, this should be set to 'private_ip_address', and Ansible must
          be run from with EC2.
      */

      if (settings.vpc_destination_variable === "ip_address") {
        dest = instance["PublicIpAddress"];
      } else {
        dest = instance[changeCase.pascalCase(settings.vpc_destination_variable)];
      }

    } else {

      /* 
          This is the normal destination variable to use. If you are running Ansible 
          from outside EC2, then 'public_dns_name' makes the most sense. If you are
          running Ansible from within EC2, then perhaps you want to use the internal
          address, and should set this to 'private_dns_name'. 
      */

      dest = instance[changeCase.pascalCase(settings.destination_variable)];
    }

    // Skip instances we cannot address (e.g. private VPC subnet)
    if (!dest) {
      return;
    }

    // if we only want to include hosts that match a pattern, skip those that don't
    if (settings.pattern_include && !settings.pattern_include.match(dest)) {
      return;
    }

    // if we need to exclude hosts that match a pattern, skip those
    if (settings.pattern_exclude && settings.pattern_exclude.match(dest)) {
      return;
    }

    // Add to index
    index[dest] = [region, instance.InstanceId];

    // Inventory: Group by instance ID (always a group of 1)
    inventory[instance.InstanceId] = [dest];
    if (settings.nested_groups) {
      _pushGroup(inventory, "instances", instance.InstanceId);
    }

    // Inventory: Group by region
    if (settings.nested_groups) {
      _pushGroup(inventory, "regions", region);
    } else {
      _pushGroup(inventory, "regions", instance.Placement);
    }

    // Inventory: Group by availability zone
    _pushGroup(inventory, instance.Placement, dest);
    if (settings.nested_groups) {
      _pushGroup(inventory, region, instance.Placement);
    }

    // Inventory: Group by instance type
    var type_name = "type_" + instance.InstanceType;
    _pushGroup(inventory, type_name, dest);

    // Inventory: Group by SSH key pair
    if (instance.KeyName) {
      var key_name = "key_" + instance.KeyName;
      _pushGroup(inventory, key_name, dest);
      if (settings.nested_groups) {
        _pushGroup(inventory, "keys", key_name);
      }
    }
    // Inventory: Group by security group
    instance.SecurityGroups.forEach(function(group) {
      var key = "security_group_" + group.GroupName;
      _pushGroup(inventory, key, dest);
      if (settings.nested_groups) {
        _pushGroup(inventory, key, dest);
      }
    });

    // Inventory: Group by tag keys
    instance.Tags.forEach(function(tag) {
      var key = "tag_" + tag.Key + "=" + tag.Value;
      _pushGroup(inventory, key, dest);
      if (settings.nested_groups) {
        _pushGroup(inventory, "tags", "tag_" + tag.Key);
        _pushGroup(inventory, "tag_" + tag.Key, key);
      }
    });

    // Global Tag: Tag all EC2 instances
    _pushGroup(inventory, "ec2", dest);
    inventory["_meta"]["hostvars"][dest] = _getHostInfoDictFromInstance(instance, region);

    return inventory;
  };

  /*
        var addRdsInstance = function() {

            console.log("Add RDS instance ");

        };
  */

  var _filteredZones = function(zones) {
    // Filter out any excluded zones defined in the ini file
    var filteredZones = [];
    zones.map(function(zone) {
      if (settings.route53_excluded_zones.indexOf(zone.Name.replace(/\.$/, "")) < 0) {
        filteredZones.push(zone);
      }
    });
    return filteredZones;
  };

  var _getZoneResourceRecords = function(zones) {
    return Promise.map(zones, function(zone) {
      var params = {
        HostedZoneId: zone.Id
      };
      return allRrSets(params).then(function(data) {
        zone.ResourceRecordSets = data.ResourceRecordSets;
        return zone;
      });
    });
  };

  var _getRoute53Records = function() {
    var route53_zones = [];
    var rrsets = [];
    var route53_records = {};
    return new Promise(function(resolve, reject) {
      // AWS Route53 API query all zones
      allZones().then(function(zones) {
        return zones.HostedZones;
      }).then(function(zones) {
        // Filter out excluded zones defined in ini file
        return _filteredZones(zones);
      }).then(function(zones) {
        // Collect all resource records for each zone
        return _getZoneResourceRecords(zones);
      }).then(function(zones) {
        // Return everything
        settings.route53_records = zones;
        resolve(zones);
      }).catch(function(e) {
        reject(e);
      });
    });
  };

  var _useRoute53RecordsCheck = function() {

    /*
       Determine whether or not we need to get route53 zones / records
       This refers to the route53 flag in the ini file and determines
       whether or not we tag instances with their route53 names.

       This enables us to ensure that settings.route53_records is set
       before continuring.
    */

    return new Promise(function(resolve, reject) {
      if (settings.route53_enabled) {
        _getRoute53Records().then(function() {
          resolve(true);
        });
      } else {
        resolve(true);
      }
    });
  };

  /*var _getInstanceRoute53Names = function() {

      console.log("Get instance Route 53 records ");

    };
  */

  var _getHostInfoDictFromInstance = function(instance, region) {
    //console.log(JSON.stringify(instance, null, 4));
    var instance_vars = {};
    instance_vars["ec2_region"] = region;
    var keys = Object.keys(instance);

    // Loop keys and create instance_vars object to match ec2.py's inventory
    keys.forEach(function(key) {
      var val = instance[key];

      if (key === "State") {
        instance_vars["ec2_state"] = instance.State.Name || "";
        instance_vars["ec2_state_code"] = instance.State.Code;
      } else if (key === "PreviousState") {
        instance_vars["ec2_previous_state"] = instance.PreviousState || "";
        instance_vars["ec2_previous_state_code"] = instance.PreviousState.Code;
      } else if (key === "ProductCodes") {
        instance_vars["ec2_product_code_id"] = instance.ProductCodes.ProductCodeId || "";
        instance_vars["ec2_product_code_type"] = instance.ProductCodes.ProductCodeType;
      } else if (key === "Placement") {
        instance_vars["ec2_placement"] = instance.Placement.AvailabilityZone || "";
        instance_vars["ec2_placement_tenancy"] = instance.Placement.Tenancy || "";
        instance_vars["ec2_placement_group_name"] = instance.Placement.GroupName|| "";
      } else if (key === "Monitoring") {
        instance_vars["ec2_monitoring_state"] = instance.Monitoring.State || "";
      } else if (typeof val === "boolean" || typeof val === "number") {
        instance_vars["ec2_"+changeCase.snakeCase(key)] = val;
      } else if (typeof val === "string") {
        instance_vars["ec2_"+changeCase.snakeCase(key)] = val;
      } else if (typeof val === "object") {
        instance_vars["ec2_"+changeCase.snakeCase(key)] = val;
      } else if (typeof val === "undefined") {
        instance_vars["ec2_"+changeCase.snakeCase(key)] = "";
      } else if (key === "Placement") {
        instance_vars["ec2_placement"] = val.AvailabilityZone;
      } else if (key === "Tags") {
        instance.Tags.forEach(function(tag) {
          var key = "ec2_tag_" + tag.Key;
          instance_vars[key] = tag.Value;
        });
      } else if (key === "SecurityGroups") {
        var group_ids = [];
        var group_names = [];
        instance.SecurityGroups.forEach(function(group) {
          group_ids.push(group.GroupId);
          group_names.push(group.GroupName);
          instance_vars["ec2_group_ids"] = group_ids.join();
          instance_vars["ec2_group_names"] = group_names.join();
        });
      } else {
        console.log("UNMATCHED KEY / VAL: " + "ec2_"+changeCase.snakeCase(key) + " : " + val + " (typeof: "+(typeof val)+")");
      }

    });

    return instance_vars;
  };

  /*
            var  = function() {

                console.log("Get host info ");

            };

            var push = function() {

                console.log("Push ");

            };

    */

  var _pushGroup = function(obj, key, element) {
    // Push a group as a child of another group.
    //var parent_group = obj[key] == undefined ? {} : obj[key]
    (key in obj && obj[key] !== null) || (obj[key] = {});
    var parent_group = obj;
    if (!(obj instanceof Object)) {
      parent_group = obj[key] = {
        'hosts': parent_group
      };
    }

    ("children" in parent_group && parent_group["children"] !== null) || (parent_group["children"] = []);
    var child_groups = parent_group["children"];
    if (!(element in child_groups)) {
      child_groups.push(element);
    }
  };

  /*
          var getInventoryFromCache = function() {

              console.log("Get inventory from cache ");

          };

          var loadIndexFromCache = function() {

              console.log("Load index from cache ");

          };
    */
  var _writeToCache = function(data, path) {
    return is.writeFile(path, JSON.stringify(data, null, 4));
  };
  /*
          var toSafe = function() {

              console.log("To safe ");

          };

          var jsonFormatDict = function() {

              console.log("JSON format dict ");

          };
      */


  // Start with an empty inventory hash
  //var inventory = _emptyInventory();
  //var data_to_print;

  //Index of hostname(address) to instance ID
  //var index = {};

  //var regions = [];

  var index = [];
  var inventory = _emptyInventory();

  var settings = _readSettings(config);

  //console.log(settings);

  //var regions = getServiceRegions("ec2");
  //console.log(regions);

  /*var regions = _getRegions().then(function(regions) {
    console.log(regions);
  });*/

  /*if (inventory) {
    data_to_print = inventory;
  } else {
    data_to_print = {
      "_meta": {
        "hostvars": {
          "somehost": "123.456.789.0"
        }
      }
    };

  }*/

  /*doApiCallsUpdateCache().then(function() {
    console.log("Completed API Calls Update");
  });*/

  /*_getRoute53Records().then(function(zones) {
    zones.forEach(function(zone) {
      //console.log(zone.Id + ": " + zone.Name);
      zone.ResourceRecordSets.forEach(function(rrset) {
        console.log(JSON.stringify(rrset));
      });
    });
  });*/

  var refreshCache = function() {
    _doApiCallsUpdateCache().then(function(inventory) {
      console.log(inventory);
    });
  };

  return {
    inventory: getInventory,
    refresh: refreshCache,
    instance: getInstance
  };

};

/*new AWS.EC2().describeInstances(function(error, data) {
  if (error) {
    console.log(error) // an error occurred
  } else {
    console.log(data) // request succeeded
  }
})*/

// Export Ec2di()
module.exports = ec2di;
