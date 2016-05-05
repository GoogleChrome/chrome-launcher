#!/usr/bin/env node
/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const meow = require('meow');
const log = require('../src/lib/log.js');
const semver = require('semver');
const Printer = require('./printer');

const lighthouse = require('../module');

// node 5.x required due to use of ES2015 features
if (semver.lt(process.version, '5.0.0')) {
  console.error('Lighthouse requires node version 5.0 or newer');
  process.exit(1);
}

const cli = meow(`
  Usage
    lighthouse [url]

  Options
    --help            Show this help
    --version         Current version of package
    --verbose         Displays verbose logging
    --quiet           Displays no progress or debug logs
    --mobile          Emulates a Nexus 5X (default=true)
    --load-page       Loads the page (default=true)
    --save-trace      Save the trace contents to disk
    --save-artifacts  Generate network dependency graph
    --output          How to output the page(default=pretty)
    --output-path     The location to output the response(default=stdout)
`);

const url = cli.input[0] || 'https://pwa.rocks/';
const outputMode = cli.flags.output || 'pretty';
const outputPath = cli.flags.outputPath || 'stdout';
const flags = cli.flags;

// set logging preferences
flags.logLevel = 'info';
if (cli.flags.verbose) {
  flags.logLevel = 'verbose';
} else if (cli.flags.quiet) {
  flags.logLevel = 'error';
}

// kick off a lighthouse run
lighthouse(url, flags)
  .then(results => {
    return Printer.write(results, outputMode, outputPath);
  })
  .then(status => {
    outputPath !== 'stdout' && log.info('printer', status);
  })
  .catch(err => {
    if (err.code === 'ECONNREFUSED') {
      console.error('Unable to connect to Chrome. Did you run ./launch-chrome.sh?');
    } else {
      console.error('Runtime error encountered:', err);
      console.error(err.stack);
    }
    process.exit(1);
  });
