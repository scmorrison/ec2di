#!/usr/bin/env node

/**
 * cli interface to ec2di
 */
var program = require('commander'),
  pkg = require("../package.json"),
  chalk = require('chalk'),
  completion = require('completion'),
  ec2di = require("../lib/ec2di")("./ec2.ini");

//var ec2di = require('../lib/ec2di')

var options = {}

// Setup for command line argumens (see commander.js)
program
  .version(require('../package.json').version)

program
  .command("list")
  .usage("returns all EC2 and RDS instances for regions defined in config \n\t file (ec2.ini).")
  .description("List all EC2 and RDS instances.")
  .action(function(program) {
    var inventory = ec2di.inventory;
    console.log(inventory);

    /*ec2di.isCacheValid().then(function(valid) {
      console.log(valid);
    });
    console.log(ec2di.inventory);*/

    /*.then(function(settings) {
      console.log(settings);
    });*/
  })

program
  .command("refresh")
  .usage("replaces the local inventory cache with the current EC2 / RDS \n\t inventory from AWS for regions defined in config file (ec2.ini).")
  .description("Refresh local inventory cache.")
  .action(function(program) {

    ec2di.doApiCallsUpdateCache().then(function(inventory) {
      console.log(inventory);
    });

  })

program
  .command("regions")
  .usage("prints all know ec2 regions.")
  .description("Print out ec2 regions.")
  .action(function() {

    ec2di.getRegions('ec2')
      .then(function(regions) {
        console.log(regions)
      })

    //log.success('Create ' + name + '@1.0.0 success!')

    //var regions = ec2di.getRegions()  


  })

program
  .command("instance [instanceid]")
  .usage("[instanceid] returns host data for the specified instance-id.")
  .description("Get all the variables about a specific instance")
  .action(function(instanceid, program) {

    ec2di.getInstance(instanceid)

  })

program.on("--help", function() {
  console.log("  Use 'ec2di <command> --help' to get more information or visit https://github.com/scmorrison/ec2di to learn more.")
  console.log('')
})


// Process passed arguments
program.parse(process.argv)

// Print help when no args
if (program.args.length < 1) {
  program.help()
}
