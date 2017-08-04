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

function keepLine(line) {
  // This gets hackier and hackier to test. We are removing lines
  // that either change by run/env or npm/node version.
  return !line.match(/(.*npm ERR!)|(.*at )|(Unhandled rejection Error.*)/);
}

function fwdSlashPaths(line) {
  // the fixture paths are recorded on a developer machine.
  // There are two reasons for variations -
  // 1. CI systems use different paths.
  // 2. Windows and *nix use different path conventions.
  //
  var fixturePath = '/Users/sramam/github/sramam/npm-run-batch';
  var currentPath = path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
  return line.replace(/\\/g, '/').replace(currentPath, fixturePath);
}

function adjustFixture(fixture) {
  // fixes paths & versions in fixtures, to match current run
  var fixturePath = '/Users/sramam/github/sramam/npm-run-batch';
  var currentPath = path.resolve(__dirname, '..', '..');
  return fixture
    .split('\n')
    .reduce(function (_, line) {
      if (keepLine(line)) {
        _.push(
          line
          .replace(fixturePath, currentPath)
          .replace('npm-run-batch@0.0.1', 'npm-run-batch@' + pkg.version)
        );
      }
      return _;
    }, [])
    .join('\n');
}

function adjustOutputStackTrace(output) {
  return output
    .split('\n')
    .reduce(function (_, line) {
      if (keepLine(line)) {
        _.push(fwdSlashPaths(line));
      }
      return _;
    }, [])
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

function compareFiles(actualOutput, expectedOutput) {
  var errorFile = /\/.npm\/_logs\/.*-debug.log/;
  var actual = adjustOutputStackTrace(fs.readFileSync(actualOutput, 'utf-8'));
  var expected = adjustFixture(fs.readFileSync(expectedOutput, 'utf-8'));

  actual = remapErrorLogFile(actual).trim();
  expected = remapErrorLogFile(expected).trim();
  var res = (actual === expected);
  if (res === false) {
    console.log('--------');
    console.log(diff.diffChars(actual, expected));
    console.log('--------');
    console.log(`\n:::actual:::\n${actual}\n----`);
    console.log(`\n:::expected:::\n${expected}\n----`);
    // If the comparison fails, log diff to stderr.
    diff.diffChars(actual, expected)
      .forEach(function (part) {
        var color = part.added ? 'green' :
          part.removed ? 'red' : 'grey';
        process.stderr.write(chalk[color](part.value));
      });
    process.stderr.write('\n');
    // useful for a quick comparison when things fail
    // these files are .gitignored.
    fs.writeFileSync('./j1', actual, 'utf8');
    fs.writeFileSync('./j2', expected, 'utf8');
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
          done(err);
        });
    });
  });
});
