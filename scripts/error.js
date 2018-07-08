#!/usr/bin/env node
var chalk = require('chalk');
var program = require('commander');

program
  .option('-t, --timeout <n>', 'timeout to wait for', 1000)
	.parse(process.argv);

// console.log(process.env)
console.log('before error ' + program.timeout);
process.exit = -1
throw new Error (chalk.red('Sequence errored out'))

// should never get here...
console.log(chalk.yellow('after error ' + program.timeout))
