#!/usr/bin/env node
var chalk = require('chalk');
var program = require('commander');

program
  .option('-t, --timeout <n>', 'timeout to wait for', 1000)
	.parse(process.argv);

// console.log(process.env)
console.log('before error ' + program.timeout);

throw new Error (chalk.red('Sequence errored out'))
console.log(chalk.yellow('after error ' + program.timeout))
