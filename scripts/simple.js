#!/usr/bin/env node
var program = require('commander');

program
  .option('-t, --timeout <n>', 'timeout to wait for', 1000)
	.parse(process.argv);

console.log('Simple: before timeout ' + program.timeout);
setTimeout(function() {
  console.log('Simple: after timeout ' + program.timeout);
}, program.timeout)
