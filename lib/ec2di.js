var _ = require('underscore');
var config = require('../ec2.js');
var AWS = require('aws-sdk');

AWS.config.apiVersion = '2014-06-15';
AWS.config.region = config.ec2.regions;

module.exports = function(options) {

    var action = options.action !== undefined ? options.action : 'nothing';
    var instanceId = options.instanceId !== undefined ? options.instanceId : '';

    console.log(action + ': ' + instanceId);

    var isCacheValid = function() {

        console.log('Is cache valid');

    };

    var readSettings = function() {

        console.log('Read settings');

    };

    var doApiCallsUpdateCache = function() {

        console.log('Refreshing cache');

    };

    var getRegions = function() {

        // Get all regions
        new AWS.EC2().describeRegions({}, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else console.log(data); // successful response
        });

    }

    var getInstancesByRegion = function() {

        console.log('Get instances by region');

    };

    var getRdsInstancesByRegion = function() {

        console.log('Get RDS instances by region');

    };

    var getInstance = function() {

        console.log('Get instance');

    };

    var addInstance = function() {

        console.log('Add instance');

    };

    var addRdsInstance = function() {

        console.log('Add RDS instance');

    };

    var getRoute53Records = function() {

        console.log('Get Route 53 records');

    };

    var getInstanceRoute53Names = function() {

        console.log('Get instance Route 53 records');

    };

    var getHostInfoDictFromInstance = function() {

        console.log('Get host info dict from instance');

    };

    var getHostInfo = function() {

        console.log('Get host info');

    };

    var push = function() {

        console.log('Push');

    };

    var pushGroup = function() {

        console.log('Push group');

    };

    var getInventoryFromCache = function() {

        console.log('Get inventory from cache');

    };

    var loadIndexFromCache = function() {

        console.log('Load index from cache');

    };

    var writeToCache = function() {

        console.log('Write to cache');

    };

    var toSafe = function() {

        console.log('To safe');

    };

    var jsonFormatDict = function() {

        console.log('JSON format dict');

    };


    /*new AWS.EC2().describeInstances(function(error, data) {
      if (error) {
        console.log(error); // an error occurred
      } else {
        console.log(data); // request succeeded
      }
    });*/
};
