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
const lighthouse = require('./');
const log = require('npmlog');
const semver = require('semver');
const Printer = require('./cli/printer');
const cli = meow(`
  Usage
    lighthouse [url]

  Options
    --help         Show this help
    --version      Current version of package
    --verbose      Displays verbose logging
    --quiet        Displays no progress or debug logs
    --json         Output results as JSON

`);

const defaultUrl = 'https://operasoftware.github.io/pwa-list/';
const url = cli.input[0] || defaultUrl;

if (semver.lt(process.version, '5.0.0')) {
  console.error('Lighthouse requires node version 5.0 or newer');
  process.exit(1);
}

lighthouse({
  url: url,
  flags: cli.flags
}).then(results => {
  Printer[cli.flags.json ? 'json' : 'prettyPrint'](log, console, url, results);
});

if (cli.flags.verbose) {
  log.level = 'verbose';
} else if (cli.flags.quiet) {
  log.level = 'error';
}
