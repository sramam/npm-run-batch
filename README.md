[![Build status](https://travis-ci.org/sramam/npm-run-batch.svg)](https://travis-ci.org/sramam/npm-run-batch)

# npm-run-batch
npm run-script helper that allows running multiple run-scripts in series & parallel

`npm-run-batch` allows npm to be used as a build tool with a minimum of fuss.

It's not uncommon to see npm run-scripts that look like te one below:

    "prebuild": "npm run build:clean && npm run test",
    "build": "cross-env NODE_ENV=production webpack --config internals/webpack/webpack.prod.babel.js --color -p",
    "build:clean": "npm run test:clean && rimraf ./build",
    "build:dll": "node ./internals/scripts/dependencies.js",

Spefically, look at all the `&&` embedded in there. They make creating and debugging these system harder.

To tackle this (and other things, but I never claim impartiality!), multiple build/automation tools have been craated [gulp](http://gulpjs.com/), [grunt](http://gruntjs.com/), [brunch](http://brunch.io/) and that is not even the whole [list](https://github.com/sindresorhus/awesome-nodejs#build-tools).

However, this is not without [debate](https://www.google.com/?ion=1&espv=2#q=grunt%20gulp%20or%20npm).

A persistent source of complexity with using npm as a build tool are the pesky && to chain commands together. Further, one cannot run multiple commands in parallel. Here's a good [example](http://stackoverflow.com/questions/30950032/how-can-i-run-multiple-npm-scripts-in-parallel) why that can be necessary.

`npm-run-batch` attempts to solve the problem of composing complex automation flows for npm-as-a-build-tool. 
It provides simple semantics, aids clarity and requires almost no extra installed weight.

# Installation

    npm install npm-run-batch

# Usage
The module exposes two binary aliases - 

    npm-run-batch
    run-batch

These are meant to be invoked from npm-run scripts and used for the grouping of batch sequences as
we shall see next. 


In your package.json, define tasks as usual, but they do only one thing.
The batch operations are the ones that are the meat of your run-script. 


    "scripts": {
      "task:1": "a simple task",
      "task:2": "a simple task",
      "task:3": "a simple task",
      "task:4": "a simple task",
      "batch:1": "run-batch",
      "batch:2": "run-batch"
    }

Once the batch tasks have been tagged (either of the aliases will work),
1. Add a `"run-batch"` segment to your package.json
2. For each batch run-script, add a key to the `"run-batch"` section.
3. Each `"run-batch"` segment is a list of run-scripts that you want to run.
4. At each stage, run-scripts can be run in parallel if you add an array as shown for
   `"batch:2"` below.


    "run-batch": {
      "batch:1": [
        "task:1",
        "task:2"
      ],
      "batch:2": [
        "task:1",
        [ "task:2", "task:3" ], // Parallel tasks
        "task:4"
      ]
    }

Importantly, we allow for both aliases to be used interchangeably. If both aliases are present
in package.json for batching, `"run-batch"` takes precedence over `"npm-run-batch"`.

That's all there is to it!

# Working Example
Please see [package.json](./package.json) for a few working examples. Because we can't install the package within itself, instead of the alias `run-batch`, we use `node ./index.js`. With that caveat, this should work as described.

- notice the use of cross-env to pass the environment forward.
- for true cross-platform independence, we highly recommend using [shelljs](http://documentup.com/shelljs/shelljs)

Feedback of all kinds is welcome.

# License
Apache-2.0

