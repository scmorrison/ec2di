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

if(!program.args.length) {
    program.help();
} else {
    console.log('Keywords: ' + program.args);   
}
