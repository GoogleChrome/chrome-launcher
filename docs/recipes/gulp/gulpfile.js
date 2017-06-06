'use strict';

/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

const gulp = require('gulp');
const connect = require('gulp-connect');
const lighthouse = require('lighthouse');
const ChromeLauncher = require('lighthouse/lighthouse-cli/chrome-launcher').ChromeLauncher;
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const PORT = 8080;
let chromeLauncher;

/**
 * Start server
 */
const startServer = function() {
  return connect.server({
    root: './public',
    livereload: true,
    port: PORT
  });
};

/**
 * Stop server
 */
const stopServer = function() {
  connect.serverClose();
  chromeLauncher.kill();
  chromeLauncher = null;
};

/**
 * Run lighthouse
 */
const runLighthouse = function() {
  const url = `http://localhost:${PORT}/index.html`;
  const lighthouseOptions = {}; // available options - https://github.com/GoogleChrome/lighthouse/#cli-options
  return lighthouse(url, lighthouseOptions, perfConfig);
};

/**
 * Handle ok result
 * @param {Object} results - Lighthouse results
 */
const handleOk = function(results) {
  stopServer();
  console.log(results); // eslint-disable-line no-console
  // TODO: use lighthouse results for checking your performance expectations.
  // e.g. process.exit(1) or throw Error if score falls below a certain threshold.
  return results;
};

/**
 * Handle error
 */
const handleError = function(e) {
  stopServer();
  console.error(e); // eslint-disable-line no-console
  throw e; // Throw to exit process with status 1.
};

gulp.task('lighthouse', function() {
  chromeLauncher = new ChromeLauncher();

  return chromeLauncher.run().then(_ => {
    startServer();
    return runLighthouse()
      .then(handleOk)
      .catch(handleError);
  });
});

gulp.task('default', ['lighthouse']);
