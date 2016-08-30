#!/usr/bin/env node
var chalk = require('chalk');
var program = require('commander');

program
  .option('-t, --timeout <n>', 'timeout to wait for', 1000)
	.parse(process.argv);

// console.log(process.env)
console.log(chalk.blue('Colored: before timeout ' + program.timeout))
setTimeout(function() {
  console.log(chalk.cyan('Colored: after timeout ' + program.timeout))
}, program.timeout)
