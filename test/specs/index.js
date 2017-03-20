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
    .map(function (line) {
      return line
        .replace(fixturePath, currentPath)
        .replace('npm-run-batch@0.0.1', 'npm-run-batch@' + pkg.version);
    })
    .join('\n');
}

// the error logs if created, seem to put a time-stamp in the filename,
// making this very hard to compare. We'll normalize these to hack-fix this
function remapErrorLogFile(str) {
  return str
    .split('\n')
    .map(function (line) {
      return line
        .trim() // this strips whitespace from each line
        .replace(/.npm\/_logs\/.*-debug.log/, '.npm/_logs/npm-debug.log');
    })
    .join('\n')
}

function compareFiles(f1, f2) {
  var errorFile = /\/.npm\/_logs\/.*-debug.log/;
  var d1 = fs.readFileSync(f1, 'utf-8');
  var d2 = adjustFixture(fs.readFileSync(f2, 'utf-8'));

  d1 = remapErrorLogFile(d1).trim();
  d2 = remapErrorLogFile(d2).trim();
  var res = (d1 === d2);
  if (res === false) {
    // If the comparison fails, log diff to stderr.
    diff.diffChars(d1, d2)
      .forEach(function (part) {
        var color = part.added ? 'green' :
          part.removed ? 'red' : 'grey';
        process.stderr.write(chalk[color](part.value));
      });
    process.stderr.write('\n');
    // useful for a quick comparison when things fail
    // these files are .gitignored.
    fs.writeFileSync('./j1', d1, 'utf8');
    fs.writeFileSync('./j2', d2, 'utf8');
  }
  return res;
}

function spawnNpm(cmd) {
  var outFile = tmp.fileSync();
  var outStream = fs.createWriteStream('', {
    fd: fs.openSync(outFile.name, 'w'),
    decodeStrings: true
  });
  return new Promise(function (resolve, reject) {
    var options = {
      cwd: process.cwd(),
      env: process.env,
      shell: true,
      stdio: ['inherit', outStream, outStream]
    };
    var child = spawn('npm', ['run', cmd], options);
    child.once('close', function (code) {
      if (code === 0) {
        resolve(outFile.name);
      } else {
        var err = new Error('ERROR: `npm run ' + cmd + '` exited with errorCode ' + code);
        reject(err, outFile.name);
      }
    });
    child.once('error', function (err) {
      console.log('!!!!!!!!!!!!!!!!!! ' + err.message);
      reject(err, outFile.name);
    });
  })
}


describe('npm-run-batch', function () {
  samples.forEach(function (sample) {
    it(sample.task, function (done) {
      spawnNpm(sample.task)
        .then(function (fname) {
          expect(
            compareFiles(fname, sample.expectedOutput)
          ).to.be.true;
          done();
        }).catch(function (err) {
          console.log('>>>>>>>>> error log ' + err);
          done(err);
        });
    });
  });
});
