var _ = require('underscore');
var config = require('../ec2.js');
var AWS = require('aws-sdk');

AWS.config.apiVersion = '2014-06-15';
AWS.config.region = config.ec2.regions;

module.exports = function(program) {

    // Get all regions
    new AWS.EC2().describeRegions({}, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log(data); // successful response
    });

    /*new AWS.EC2().describeInstances(function(error, data) {
      if (error) {
        console.log(error); // an error occurred
      } else {
        console.log(data); // request succeeded
      }
    });*/
};
