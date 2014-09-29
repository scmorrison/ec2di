#!/usr/bin/env node

var program = require('commander');
var chalk = require('chalk');
var completion = require('completion');
var config = require('../ec2.js')
var ec2di = require('../lib/ec2di');

program
  .version(require('../package.json').version)
  .option('-l, --list', 'List instances (default: True)', true)
  .option('-r, --refresh', 'Force refresh of cache by making API requests to EC2 (default: False - use cache files)')
  .option('-i, --instance', 'Get all the variables about a specific instance')
  .option('-v, --version', 'print version', false)
  .parse(process.argv);

var options = {};

if(!program.argv || program.list) {
    options.action = 'list';
} else if (program.refresh){
    options.action = 'refresh';
} else if (program.instance){
    options.action = 'instance';
    options.instanceId = program.instance;
} else if (program.help) {
    program.help();
}

ec2di(options);
