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

const lighthouseModule = require('../');
const lighthouse = require('../src/lighthouse');

// node 5.x required due to use of ES2015 features
if (semver.lt(process.version, '5.0.0')) {
  console.error('Lighthouse requires node version 5.0 or newer');
  process.exit(1);
}

const formatOptions = Object.values(Printer.OUTPUT_MODE).join(', ');

const cli = meow(`
Usage:
    lighthouse [url]

Basic:
    --help             Show this help
    --version          Current version of package

Logging:
    --verbose          Displays verbose logging
    --quiet            Displays no progress or debug logs

Run Configuration:
    --mobile           Emulates a Nexus 5X (default=true)
    --load-page        Loads the page (default=true)
    --save-assets      Save the trace contents & screenshots to disk
    --save-artifacts   Save all gathered artifacts to disk
    --audit-whitelist  Comma separated list of audits to run (default=all)
    --list-all-audits  Prints a list of all available audits and exits

Output:
    --output           Reporter for the results
                       Reporter options: ${formatOptions}  (default=pretty)
    --output-path      The file path to output the results (default=stdout)
                       Example: --output-path=./lighthouse-results.html
`, {
  // These options do not have a value
  boolean: [
    'save-assets', 'save-artifacts', 'list-all-audits',
    'verbose', 'quiet', 'help', 'version'
  ]
});

if (cli.flags.listAllAudits) {
  const audits = lighthouse
      .getAuditList()
      .map(i => {
        return i.replace(/\.js$/, '');
      });

  log.info('All lighthouse audits:', audits.join(', '));
  process.exit(0);
}

const url = cli.input[0] || 'https://m.aliexpress.com/';
const outputMode = cli.flags.output || Printer.OUTPUT_MODE.pretty;
const outputPath = cli.flags.outputPath || 'stdout';
const flags = cli.flags;

// If the URL isn't https or localhost complain to the user.
if (url.indexOf('https') !== 0 && url.indexOf('http://localhost') !== 0) {
  log.warn('Lighthouse', 'The URL provided should be on HTTPS');
  log.warn('Lighthouse', 'Performance stats will be skewed redirecting from HTTP to HTTPS.');
}

// set logging preferences
flags.logLevel = 'info';
if (cli.flags.verbose) {
  flags.logLevel = 'verbose';
} else if (cli.flags.quiet) {
  flags.logLevel = 'error';
}

// Normalize audit whitelist.
if (!flags.auditWhitelist || flags.auditWhitelist === 'all') {
  flags.auditWhitelist = null;
} else {
  flags.auditWhitelist = new Set(flags.auditWhitelist.split(',').map(a => a.toLowerCase()));
}

// kick off a lighthouse run
lighthouseModule(url, flags)
  .then(results => Printer.write(results, outputMode, outputPath))
  .then(results => {
    if (outputMode !== 'html') {
      Printer.write(results, 'html', './last-run-results.html');
    }
    return;
  })
  .catch(err => {
    if (err.code === 'ECONNREFUSED') {
      console.error('Unable to connect to Chrome. Did you run ./scripts/launch-chrome.sh ?');
    } else {
      console.error('Runtime error encountered:', err);
      console.error(err.stack);
    }
    process.exit(1);
  });
