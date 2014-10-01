#!/usr/bin/env node

var program = require('commander');
var pkg = require("../package.json")
var chalk = require('chalk');
var completion = require('completion');
var ec2di = require('../lib/ec2di');

var options = {};

program
    .version(require('../package.json').version)

program
    .command("list")
    .usage("returns all EC2 and RDS instances for regions defined in config \n\t file (ec2.ini).")
    .description("List all EC2 and RDS instances.")
    .action(function(program) {
      
        var inventory = ec2di.emptyInventory();
        console.log(inventory);

    })

program
    .command("refresh")
    .usage("replaces the local inventory cache with the current EC2 / RDS \n\t inventory from AWS for regions defined in config file (ec2.ini).")
    .description("Refresh local inventory cache.")
    .action(function(program) {
      
        ec2di.doApiCallsUpdateCache();

    })

program
    .command("instance [instanceid]")
    .usage("[instanceid] returns host data for the specified instance-id.")
    .description("Get all the variables about a specific instance")
    .action(function(instanceid, program) {
      
        ec2di.getInstance(instanceid);

    })

program.on("--help", function(){
  console.log("  Use 'ec2di <command> --help' to get more information or visit https://github.com/scmorrison/ec2di to learn more.")
  console.log('')
})

program.parse(process.argv)

if(program.args.length < 1){
  program.help()
}
