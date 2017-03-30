'use strict';

/**
 * Copyright 2017 Google Inc. All rights reserved.
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

const gulp = require('gulp');
const connect = require('gulp-connect');
const lighthouse = require('lighthouse');
const ChromeLauncher = require('lighthouse/lighthouse-cli/chrome-launcher').ChromeLauncher;
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const PORT = 8080;
let launcher;

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
  launcher.kill();
};

/**
 * Launch chrome
 */
const launchChrome = function() {
  launcher = new ChromeLauncher();
  return launcher.isDebuggerReady()
    .catch(() => {
      return launcher.run();
    });
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
  // TODO: use lighthouse results for checking your performance expectations
  /* eslint-disable no-console */
  console.log(results);
  process.exit(0);
};

/**
 * Handle error
 */
const handleError = function() {
  stopServer();
  process.exit(1);
};

gulp.task('lighthouse', function() {
  launchChrome().then(_ => {
    startServer();
    return runLighthouse()
      .then(handleOk)
      .catch(handleError);
  });
});

gulp.task('default', ['lighthouse']);
