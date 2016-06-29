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

const yargs = require('yargs');
const semver = require('semver');
const Printer = require('./printer');
const lighthouse = require('../lighthouse-core');

// node 5.x required due to use of ES2015 features
if (semver.lt(process.version, '5.0.0')) {
  console.error('Lighthouse requires node version 5.0 or newer');
  process.exit(1);
}

const cli = yargs
  .help('help')
  .version()
  .showHelpOnFail(false, 'Specify --help for available options')

  .usage('$0 url')

  // List of options
  .group([
    'verbose',
    'quiet'
  ], 'Logging:')
  .describe({
    verbose: 'Displays verbose logging',
    quiet: 'Displays no progress or debug logs'
  })

  .group([
    'mobile',
    'load-page',
    'save-assets',
    'save-artifacts',
    'audit-whitelist',
    'list-all-audits',
    'list-trace-categories',
    'config-path'
  ], 'Configuration:')
  .describe({
    'mobile': 'Emulates a Nexus 5X',
    'load-page': 'Loads the page',
    'save-assets': 'Save the trace contents & screenshots to disk',
    'save-artifacts': 'Save all gathered artifacts to disk',
    'audit-whitelist': 'Comma separated list of audits to run',
    'list-all-audits': 'Prints a list of all available audits and exits',
    'list-trace-categories': 'Prints a list of all required trace categories and exits',
    'config-path': 'The absolute path to the config JSON.'
  })

  .group([
    'output',
    'output-path'
  ], 'Output:')
  .describe({
    'output': 'Reporter for the results',
    'output-path': `The file path to output the results
Example: --output-path=./lighthouse-results.html`
  })

  // boolean values
  .boolean([
    'save-assets',
    'save-artifacts',
    'list-all-audits',
    'list-trace-categories',
    'verbose',
    'quiet',
    'help',
    'version'
  ])

  .choices('output', Object.values(Printer.OUTPUT_MODE))

  // default values
  .default('mobile', true)
  .default('load-page', true)
  .default('audit-whitelist', 'all')
  .default('output', Printer.OUTPUT_MODE.pretty)
  .default('output-path', 'stdout')
  .check(argv => {
    // Make sure lighthouse has been passed a url, or at least one of --list-all-audits
    // or --list-trace-categories. If not, stop the program and ask for a url
    if (!argv.listAllAudits && !argv.listTraceCategories && argv._.length === 0) {
      throw new Error('Please provide a url');
    }

    return true;
  })
  .argv;

if (cli.listAllAudits) {
  const audits = lighthouse
      .getAuditList()
      .map(i => {
        return i.replace(/\.js$/, '');
      });

  process.stdout.write(JSON.stringify({audits}));
  process.exit(0);
}

if (cli.listTraceCategories) {
  const traceCategories = lighthouse.traceCategories;

  process.stdout.write(JSON.stringify({traceCategories}));
  process.exit(0);
}

const url = cli._[0];
const outputMode = cli.output;
const outputPath = cli.outputPath;
const flags = cli;
const config = (cli.configPath && require(cli.configPath)) || null;

// set logging preferences
flags.logLevel = 'info';
if (cli.verbose) {
  flags.logLevel = 'verbose';
} else if (cli.quiet) {
  flags.logLevel = 'error';
}

// Normalize audit whitelist.
if (!flags.auditWhitelist || flags.auditWhitelist === 'all') {
  flags.auditWhitelist = null;
} else {
  flags.auditWhitelist = new Set(flags.auditWhitelist.split(',').map(a => a.toLowerCase()));
}

// kick off a lighthouse run
lighthouse(url, flags, config)
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
