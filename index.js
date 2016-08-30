'use strict';

var path = require('path');
var fs = require('fs');
var Promise = require('bluebird');
var spawn = require('cross-spawn');
var program = require('commander');

var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');


var cwd = process.cwd();
// package.json of the module we are installed in.
var pkg = require(path.join(cwd, 'package.json'));
// package.json of this module.
var self_pkg = require(path.join(__dirname, 'package.json'));

function makeError(code, cmd, stderr) {
	var err = new Error('ERROR:' + cmd + ' exited with status code ' + code);
	err.exitStatus = code;
	err.stderr = stderr || null;
	return err;
};

var _spawn = function(task, cmd, args, opts) {
	return new Promise(function(resolve, reject) {
		var options = {
			env: process.env,
			stdio: 'inherit'
		};
		var child = spawn(cmd, args, options);
		child.once('close', function(code) {
			if (code === 0) {
				resolve();
			} else {
				var err = makeError(code, [cmd].concat(args), null);
				reject(err);
			}
		});
		child.once('error', function(err) {
			reject(err);
		});
	})
}

function runNpmTask(task, opts) {
	var npm = (process.platform === "win32" ? "npm.cmd" : "npm");
	var args = ['run-script', task];
	return _spawn(task, npm, args, opts);
}

function runNpmParallel(tasks, opts) {
	var promises = Promise.map(
		tasks, 
		function(task) {
			return runNpmTask(task, opts)
		}
	);
	return Promise.all(promises);
}

function main(name, opts) {
	var batch = pkg.hasOwnProperty('run-batch') ? 'run-batch': 'npm-run-batch';
	if (
		!pkg.hasOwnProperty(batch) ||
		!pkg[batch].hasOwnProperty(name)
	) {
		var msg = 'ERROR: [""' + batch +'""]["' + name + '"] not found in ' + path.join(cwd, 'package.json')
		throw new Error(msg);
	}
	return Promise.mapSeries(pkg[batch][name], function(seqEl) {
		var type = toString.call(seqEl);
		switch(type) {
			case '[object Array]':
				return runNpmParallel(
					seqEl,
					{
						concurrency: opts.concurrency || 'Infinity'
					}
				);
			case '[object String]':
				return runNpmTask(
					seqEl,
				 	{
						concurrency: 1
					}
				);
			default:
				throw new Error('Can only have strings or array of strings');
		}
	});
}

if (require.main === module) {
	// invoked via the command line - really, this is invoked via npm
	// in practice, but equivalent to CLI.
	// name of invoking npm command
	var name = process.env.npm_lifecycle_event;
	program
		.version(self_pkg.version)
		.option('-c, --concurrency <n>', 'Maximum number of tasks to execut in parallel.', 'Infinity')
	  .parse(process.argv);
	main(name, {
		concurrency: program.concurrency
	});
} else {
	// module was required.
	module.exports = main
}

