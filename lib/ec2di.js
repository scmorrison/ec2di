var _ = require('underscore');
var config = require('../ec2.js');
var AWS = require('aws-sdk');

AWS.config.apiVersion = '2014-06-15';
AWS.config.region = config.ec2.regions;


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

    //console.log('Read settings');

};


/*Ec2di.prototype.init = function(options) {
    //module.exports = function(options, callback) {


    if (action === 'list') {
        doApiCallsUpdateCache();
        inventory = getRegions
        //return callback(null, inventory); 
    }

    if (action === 'refresh') {
        doApiCallsUpdateCache();
    }

    if (action === 'instance') {
        getInstance(instanceId);
    }
};*/


Ec2di.prototype.isCacheValid = function() {

    console.log('Is cache valid');

};

Ec2di.prototype.doApiCallsUpdateCache = function() {

    console.log('Refreshing cache');

};

Ec2di.prototype.getRegions = function(all, callback) {

    // Get all regions
    new AWS.EC2().describeRegions({}, function(err, data) {
      
        var regions;
      
        if (err) {
            console.log(err, err.stack); 
            return callback(err);
        } 
        try {
          regions = JSON.parse(data); // successful response
        } catch (exception) {
          return callback(exception);
        }

        // All is good
        return callback(null, regions);
    });

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
