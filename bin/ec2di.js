#!/usr/bin/env node

var program = require('commander');
var chalk = require('chalk');
var completion = require('completion');
var AWS = require('aws-sdk');

program
  .version('0.0.1')
  .option('-l, --list', 'List instances (default: True)')
  .option('-r, --refresh-cache', 'Force refresh of cache by making API requests to EC2 (default: False - use cache files)')
  .option('-i, --instance', 'Get all the variables about a specific instance')
  .parse(process.argv);

if(!program.args) {
    program.help();
} else {
    console.log('Keywords: ' + program.args);   
}

AWS.config.region = 'eu-west-1';

new AWS.EC2().describeInstances(function(error, data) {
  if (error) {
    console.log(error); // an error occurred
  } else {
    console.log(data); // request succeeded
  }
});
