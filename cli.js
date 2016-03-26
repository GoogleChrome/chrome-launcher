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

const url = cli.input[0];

const prettyPrint = results => {
  log.info('\n\n\nLighthouse results:', url);
  // TODO: colorise
  let score;
  results.forEach(item => {
    score = (item.score.overall * 100).toFixed(0);
    console.log(`${item.name}: ${score}%`);

    item.score.subItems.forEach(subitem => {
      let lineItem = ` -- ${subitem.description}: ${subitem.value}`;
      if (subitem.rawValue) {
        lineItem += ` (${subitem.rawValue})`;
      }
      console.log(lineItem);
    });

    console.log('');
  });
};

lighthouse({
  url: url,
  flags: cli.flags
}).then(results => {
  if (cli.flags.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    prettyPrint(results);
  }
});

if (cli.flags.verbose) {
  log.level = 'verbose';
} else if (cli.flags.quiet) {
  log.level = 'error';
}
