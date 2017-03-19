var spawn = require('cross-spawn');
var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var tmp = require('tmp');
var expect = require('chai').expect;
var diff = require('diff');
var chalk = require('chalk');
var pkg = require('../../package.json');

// tmp.setGracefulCleanup();


var samples = [{
	task: "batch:series",
	expectedOutput: "test/fixtures/series.expected",
	expectError: false
}, {
	task: "batch:ofbatches",
	expectedOutput: "test/fixtures/ofbatches.expected",
	expectError: false
}, {
	task: "batch:dev",
	expectedOutput: "test/fixtures/dev.expected",
	expectError: false
}, {
	task: "batch:prod",
	expectedOutput: "test/fixtures/prod.expected",
	expectError: false
}, {
	task: "batch:error",
	expectedOutput: "test/fixtures/err.expected",
	expectError: true
}];


function adjustFixture(fixture) {
  // fixes paths & versions in fixtures, to match current run
  var fixturePath = '/Users/sramam/github/sramam/npm-run-batch';
  var currentPath = path.resolve(__dirname, '..', '..');
  return fixture
    .split('\n')
    .replace(fixturePath, currentPath)
    .replace('npm-run-batch@0.0.1', 'npm-run-batch@' + pkg.version)
    .join('\n');
}

function compareFiles(f1, f2) {
  var d1 = adjustFixture(fs.readFileSync(f1, 'utf-8'));
	var d2 = adjustFixture(fs.readFileSync(f2, 'utf-8'));
  var res = (d1 === d2);
	if (res === false) {
		diff.diffChars(d1, d2)
			.forEach(function(part) {
				var color = part.added ? 'green' :
					part.removed ? 'red' : 'grey';
				process.stderr.write(chalk[color](part.value));
			});
	}
	return res;
}

function spawnNpm(cmd) {
	var outFile = tmp.fileSync();
	var outStream = fs.createWriteStream('', {
		fd: fs.openSync(outFile.name, 'w'),
		decodeStrings: true
	});
	return new Promise(function(resolve, reject) {
		var options = {
			cwd: process.cwd(),
			env: process.env,
			stdio: ['inherit', outStream, outStream]
		};
		var child = spawn('npm', ['run', cmd], options);
		child.once('close', function(code) {
			if (code === 0) {
				resolve(outFile.name);
			} else {
				var err = new Error('ERROR: `npm run ' + cmd + '` exited with errorCode ' + code);
				reject(err, outFile.name);
			}
		});
		child.once('error', function(err) {
			reject(err, outFile.name);
		});
	})
}


describe('npm-run-batch', function() {
	samples.forEach(function(sample) {
		it(sample.task, function(done) {
			spawnNpm(sample.task)
				.then(function(fname) {
					// console.log(sample)
					// console.log(fname)
					expect(
						compareFiles(fname, sample.expectedOutput)
					).to.be.true;
					done();
				}).catch(function(err) {
					if (sample.expectedError) {
						expect(function() {
							compareFiles(fname, sample.expectedOutput);
						}).to.be.true;
					}
					done();
				});
		});
	});
});
