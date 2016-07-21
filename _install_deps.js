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

const exec = require('child_process').exec;

const cwd = require('path').resolve();
const corePath = `${cwd}/lighthouse-core`;
const extPath = `${cwd}/lighthouse-extension`;

const npm = 'npm --prefix';
const cmd = `${npm} ${corePath} install ${corePath} && ${npm} ${extPath} install ${extPath}`;

// Tell the user what command we're about to execute
console.log(cmd);
console.log('...');

exec(cmd,
  function(error, stdout, stderr) {
    process.stderr.write(stderr);
    process.stdout.write(stdout);
    if (stdout.length === 0) {
      console.log('The full install may not have completed.');
      console.log('To manually install child dependencies:');
      console.log(`    ${cmd}`);
    }
  });

