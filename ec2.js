#!/usr/bin/env node

/**
 * Module dependencies.
 */

var program = require('commander');

program
  .version('0.0.1')
  .option('-r, --list', 'List instances (default: True')
  .option('-P, --host', 'Get all the variables about a specific instance')
  .option('-b, --refresh-cache', 'Force refresh of cache by making API requests to EC2 (default: False - use cache files)')
  .parse(process.argv);

console.log('you ordered a pizza with:');
if (program.peppers) console.log('  - peppers');
if (program.pineapple) console.log('  - pineapple');
if (program.bbq) console.log('  - bbq');
console.log('  - %s cheese', program.cheese);
