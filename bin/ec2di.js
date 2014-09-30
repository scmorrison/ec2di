#!/usr/bin/env node

var program = require('commander');
var pkg = require("../package.json")
var chalk = require('chalk');
var completion = require('completion');
var ec2di = require('../lib/ec2di');


/*program
    .version(require('../package.json').version)
    .option('-r, --refresh', 'Force refresh of cache by making API requests to EC2 (default: False - use cache files)')
    .option('-i, --instance [instanceId]', 'Get all the variables about a specific instance')
    .option('-v, --version', 'print version', false)
    .parse(process.argv);*/

var options = {};

/*if (!process.argv || program.list) {
    options.action = 'list';
} else if (program.refresh) {
    options.action = 'refresh';
} else if (program.instance) {
    options.action = 'instance';
    options.instanceId = program.instance;
} else if (program.help) {
    program.help();
}*/

program
    .version(pkg.version)

program
    .command("list")
    .usage("List all EC2 / RDS instances.")
    .option('-l, --list', 'List instances (default: True)')
    .description("List all EC2 / RDS instances.")
    .action(function() {
      
        var inventory = ec2di.emptyInventory();
        console.log(inventory);

    })

program
    .command("refresh-cache")
    .usage("Refresh local inventory cache..")
    .option('-r, --refresh-cache', 'Refresh local inventory cache.')
    .description("Refresh local inventory cache.")
    .action(function() {
      
        ec2di.doApiCallsUpdateCache();

    })

program.parse(process.argv)

if(program.args.length < 1){
  program.help()
}

/*ec2di(options, function (err, inventory){

  if(err) console.log(err);

  console.log(inventory);

});*/
