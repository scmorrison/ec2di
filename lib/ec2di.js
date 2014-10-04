var _ = require('underscore'),
    Promise = require('bluebird'),
    ini = require('ini'),
    AWS = require("aws-sdk");

var fs = Promise.promisifyAll(require("fs"));
var config = ini.parse(fs.readFileSync('./ec2.ini', 'utf-8'));

AWS.config.apiVersion = '2014-06-15';
AWS.config.region = 'eu-west-1'; // config.ec2.regions;

function Ec2di() {


    // Start with an empty inventory hash
    var inventory = this.emptyInventory();

    //Index of hostname(address) to instance ID
    var index = {};

    // Read settings and parse CLI arguments
    var settings = this.readSettings();


};

// Inventory grouped by instance IDs, tags, security groups, regions, #and availability zones
Ec2di.prototype.emptyInventory = function() {

    return {
        "_meta": {
            "hostvars": {}
        }
    };

};

Ec2di.prototype.readSettings = function() {

    // Regions

    var regions = [];
    var configRegions = config.ec2.regions;
    var configRegionsExclude = config.ec2.regions_exclude;

    // Grab region names from endpoints.json
    this.getRegions('ec2', function(err, regions) {
        if (err) return console.log(err);
        _.each(regions, function(region){
            console.log('Name: '+region.name+', Endpoint: '+region.endpoint);
        });
    });
/*
    for (regionInfo in ec2regions) {
        regions.push(regionInfo.RegionInfo);
    };

    if (configRegions == 'all') {

        for (regionInfo in ec2regions) {
            regions.push(regionInfo.RegionInfo);
        };
    } else {
        regions = configRegions.split(',');
    };
*/
};

Ec2di.prototype.isCacheValid = function() {

    console.log('Is cache valid');

};

Ec2di.prototype.doApiCallsUpdateCache = function() {

    console.log('Refreshing cache');

};

Ec2di.prototype.getRegions = function(service, cb) {
  
    var regions = [];
    var regionNames = [];
    var endpointFile = __dirname+'/../json/endpoints.json';

    fs.readFileAsync(endpointFile, "utf8")
    .then(JSON.parse)
    .then(function(json) { 

        var endpoints = json[service];
        for (key in endpoints) {
          regions.push({ name: key,
                         endpoint: endpoints[key]
                      });
        }
        
        return cb(null, regions);
    })
    .catch(function (e) {
        console.log(e);
    });

/*var endpoints = { "ec2": [] };
    // Get all regions
    new AWS.EC2().describeRegions(function(error, data) {
        if (error) callback(error); // an error occurred
        //_.chain(regions) 
        _.map(data.Regions, function(val,key){ 
          var record = {};
          record[data.Regions[key].RegionName] = data.Regions[key].Endpoint;
          endpoints["ec2"].push(record);
        });
          

        return callback(null, endpoints);
    });*/
}

Ec2di.prototype.getInstancesByRegion = function() {

    console.log('Get instances by region');

};

Ec2di.prototype.getRdsInstancesByRegion = function() {

    console.log('Get RDS instances by region');

};

Ec2di.prototype.getInstance = function(instanceid) {

    //var action = options.action !== undefined ? options.action : 'nothing';
    //var instanceId = options.instanceId !== undefined ? options.instanceId : '';

    console.log('Get instance: ' + instanceid);

};

Ec2di.prototype.addInstance = function() {

    console.log('Add instance');

};

Ec2di.prototype.addRdsInstance = function() {

    console.log('Add RDS instance');

};

Ec2di.prototype.getRoute53Records = function() {

    console.log('Get Route 53 records');

};

Ec2di.prototype.getInstanceRoute53Names = function() {

    console.log('Get instance Route 53 records');

};

Ec2di.prototype.getHostInfoDictFromInstance = function() {

    console.log('Get host info dict from instance');

};

Ec2di.prototype.getHostInfo = function() {

    console.log('Get host info');

};

Ec2di.prototype.push = function() {

    console.log('Push');

};

Ec2di.prototype.pushGroup = function() {

    console.log('Push group');

};

Ec2di.prototype.getInventoryFromCache = function() {

    console.log('Get inventory from cache');

};

Ec2di.prototype.loadIndexFromCache = function() {

    console.log('Load index from cache');

};

Ec2di.prototype.writeToCache = function() {

    console.log('Write to cache');

};

Ec2di.prototype.toSafe = function() {

    console.log('To safe');

};

Ec2di.prototype.jsonFormatDict = function() {

    console.log('JSON format dict');

};

/*new AWS.EC2().describeInstances(function(error, data) {
  if (error) {
    console.log(error); // an error occurred
  } else {
    console.log(data); // request succeeded
  }
});*/

module.exports = new Ec2di();
