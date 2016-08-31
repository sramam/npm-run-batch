var spawn = require('cross-spawn');
var Promise = require('bluebird');
var fs = require('fs');
var tmp = require('tmp');
var expect = require('chai').expect;

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


function compareFiles(f1, f2) {
  var d1 = fs.readFileSync(f1, 'utf-8');
	var d2 = fs.readFileSync(f2, 'utf-8');
	var res = (d1 === d2);
	if (res === false) {
		console.log(d1);
		console.log('------');
		console.log(d2);
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
					if (sample.expectError) {
						expect(function() {
							compareFiles(fname, sample.expectedOutput);
						}).to.throw
					} else {
					  expect(
							compareFiles(fname, sample.expectedOutput)
						).to.be.true;
					}
					done();
				}).catch(done);
		});
	});
});
