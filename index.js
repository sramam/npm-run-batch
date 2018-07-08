#!/usr/bin/env node

'use strict';

const path = require('path');
const fs = require('fs');
const Promise = require('bluebird');
const spawn = require('cross-spawn');
const program = require('commander');
const chalk = require('chalk');

const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf8');


const cache = (() => {
  function cacheFname() {
		let pkgDir = __dirname.replace('node_modules/.*', 'node_modules');
    pkgDir = pkgDir || process.cwd();
    return path.join(pkgDir, '.npm-run-batch.cache');
	}
	
	function cleanup() {
		const cacheFile = cacheFname();
		fs.unlinkSync(cacheFile);
	}

  function getCache() {
    const cacheFile = cacheFname();
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  }

  function storeError(error) {
    const cacheFile = cacheFname();
    let cache = getCache();
    cache.errors = cache.errors || [];
    const { message, stack, ...rest}= error;
    // add current error to tail of error stack.
    cache.errors.push({ message, stack, ...rest});
	  fs.writeFileSync(cacheFile, JSON.stringify(cache), 'utf8');
	}
	

	let _isRoot = false;
	function isRoot() {
		const cacheFile = cacheFname();	
		try {
			fs.statSync(cacheFile);
		} catch(err) {
			if (err.message.match(/no such file or directory/)) {
				_isRoot = true;
				try {
				  fs.writeFileSync(cacheFile, JSON.stringify({ errors: [] }), 'utf8');
				} catch (err) {
          // the cache mechanism is broken here. 
	  			// force exit the process -
		  		console.error(`Cannot initialize a cache file for npm-run-batch book-keeping`);
			  	console.error(err.message);
				  console.error(`Please fix this before retrying the operation`);
				  process.exit(1); // exit as quickly as possible.  
				}
			}
		}
	}

	isRoot();

	return {
		isRoot: _isRoot,
		storeError: storeError,
		getCache: getCache,
		cleanup: cleanup
	}
})();

process.on('unhandledRejection', error => {
	if(cache.isRoot) {
    // for root invocation, print message to console
		const c = cache.getCache();
		c.errors.forEach(e => {
			const { message, stack, exitStatus, ...rest } = e;
			console.log(chalk.red(message));
			stack.split('\n').forEach(l => console.log(chalk.dim(l)));
			console.log(chalk.dim(JSON.stringify(...rest, null, 2)));
			cache.cleanup();
		})
	} else {
		// this is not the root invocation - store error message in cache
		cache.storeError(error);
	}
  process.exitCode = 1;
});


const cwd = process.cwd();
// package.json of the module we are installed in.
const pkg = require(path.join(cwd, 'package.json'));
// package.json of this module.
const self_pkg = require(path.join(__dirname, 'package.json'));

function makeError(code, cmd, stderr) {
	const err = new Error('ERROR:' + cmd + ' exited with status code ' + code);
	err.exitStatus = code;
	err.stderr = stderr || null;
	return err;
};

const _spawn = function(task, cmd, args, opts) {
	return new Promise(function(resolve, reject) {
		const options = {
			env: process.env,
			stdio: 'inherit'
		};
		const child = spawn(cmd, args, options);
		child.once('close', function(code) {
			if (code === 0) {
				resolve();
			} else {
				const err = makeError(code, [cmd].concat(args), null);
				reject(err);
			}
		});
    child.once('error', function(err) {
			reject(err);
		});
	})
}

function runNpmTask(task, opts) {
	// const npm = (process.platform === "win32" ? "npm.cmd" : "npm");
	const args = ['run-script', task];
	return _spawn(task, 'npm', args, opts);
}

function runNpmParallel(tasks, opts) {
	const promises = Promise.map(
		tasks,
		function(task) {
			return runNpmTask(task, opts)
		}
	);
	return Promise.all(promises);
}

function main(name, opts) {
	const batch = pkg.hasOwnProperty('run-batch') ? 'run-batch': 'npm-run-batch';
	if (
		!pkg.hasOwnProperty(batch) ||
		!pkg[batch].hasOwnProperty(name)
	) {
		const msg = 'ERROR: [""' + batch +'""]["' + name + '"] not found in ' + path.join(cwd, 'package.json')
		throw new Error(msg);
	}
	return Promise.mapSeries(pkg[batch][name], function(seqEl) {
		const type = toString.call(seqEl);
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
  })
}

if (require.main === module) {
	// invoked via the command line - really, this is invoked via npm
	// in practice, but equivalent to CLI.
	// name of invoking npm command
	const name = process.env.npm_lifecycle_event;
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
