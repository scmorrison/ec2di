/*eslint-env node */

"use strict";

var Promise = require("bluebird"),
    ini = require("ini"),
    AWS = require("aws-sdk");

var fs = Promise.promisifyAll(require("fs"));
var config = ini.parse(fs.readFileSync("./ec2.ini", "utf-8"));

AWS.config.apiVersion = "2014-06-15";
AWS.config.region = "eu-west-1"; // config.ec2.regions

// Construct Ec2di()
function ec2di() {

    var emptyInventory = function() {
        //Create an empty inventory
        return {
            "_meta": {
                "hostvars": {}
            }
        };
    };

    var getRegions = function(service) {

        var regions = [];
        var regionNames = [];
        var endpointFile = path.join(__dirname, "/../json/endpoints.json");

        return new Promise(function(resolve, reject) {
            fs.readFileAsync(endpointFile, "utf8")
                .then(JSON.parse)
                .then(function(json) {
                    var endpoints = json.services[service];
                    endpoints.forEach(function(region) {
                        regions.push(endpoints[region]);
                    });
                    resolve(regions);
                })
                .catch(function(e) {
                    reject(e);
                });
        }).nodeify();

        /*var endpoints = { "ec2": [] }
    // Get all regions
    new AWS.EC2().describeRegions(function(error, data) {
        if (error) callback(error) // an error occurred
        //_.chain(regions)
        _.map(data.Regions, function(val,key){
          var record = {}
          record[data.Regions[key].RegionName] = data.Regions[key].Endpoint
          endpoints["ec2"].push(record)
        })

        return callback(null, endpoints)
    })*/
    };

    var readSettings = function() {

        var settings = [];
        var filteredRegions = [];

        return new Promise(function(resolve, reject) {

            // Regions
            var configRegions = config.ec2.regions;
            var configRegionsExclude = config.ec2.regions_exclude;

            settings.regions = getRegions("ec2").then(function(ec2regions) {
                var filteredRegions = [];
                // Filter out excluded regions
                if (configRegions === "all") {
                    ec2regions.forEach(function(region) {
                        if (configRegionsExclude.indexOf(region) < 0) { filteredRegions.push(region); }
                    });
                } else {
                    filteredRegions = configRegions.split(",");
                }
                return filteredRegions;
            }).then(function(regions) {
                return regions;
            }).catch(function(e) {
              reject(e);
            });

            // Destination addresses
            settings.destinationVariable = config.ec2.destination_variable;
            settings.vpcDestinationVariable = config.ec2.vpc_destination_variable;

            // Route53
            settings.route53Enabled = config.ec2.route53;
            settings.route53ExcludedZones = [];
            if (config.ec2.route53_excluded_zones) {
                settings.route53ExcludedZones = config.ec2.route53_excluded_zones.split(",");
            }
            resolve(settings);
        }).nodeify();


        // Grab region names from endpoints.json
        /*this.getRegions("ec2", function(err, regions) {
        if (err) return console.log(err)
        _.each(regions, function(region) {
            console.log("Name: " + region.name + ", Endpoint: " + region.endpoint)
        })
    })*/
        /*
    for (regionInfo in ec2regions) {
        regions.push(regionInfo.RegionInfo)
    }*/

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
    var index = {};

    var regions = [];

    // Load regions JSON;
    var ec2regions = getRegions("ec2").then(function(regions) {
        return regions;
    });

    // Read settings and parse CLI arguments
    var settings = readSettings().then(function(settings) {
        console.log(settings.destinationVariable);
        return settings;
    });

    if (inventory === emptyInventory()) {
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
        getRegions: getRegions
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
