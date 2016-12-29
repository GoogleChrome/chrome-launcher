/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
/**
 * @fileoverview Server script for Project Performance Experiment.
 *
 * Functionalities:
 *   Host report pages.
 *     Report pages can be accessed via URL http://localhost:[PORT]/reports?key=[REPORT_KEY]
 */

const http = require('http');
const parse = require('url').parse;
const path = require('path');
const opn = require('opn');
const log = require('../../lighthouse-core/lib/log');
const ReportGenerator = require('../../lighthouse-core/report/report-generator');

/**
 * Start the server with an arbitrary port and open report page in the default browser.
 * @param {!Object} lighthouseParams
 * @param {!Object} results
 * @return {!Promise<string>} Promise that resolves when server is closed
 */
let lhResults;
function hostExperiment(lighthouseParams, results) {
  lhResults = results;
  return new Promise(resolve => {
    const server = http.createServer(requestHandler);
    server.listen(0);
    server.on('listening', () => {
      opn(`http://localhost:${server.address().port}/`);
    });
    server.on('error', err => log.error('PerformanceXServer', err.code, err));
    server.on('close', resolve);
    process.on('SIGINT', () => {
      server.close();
    });
  });
}

function requestHandler(request, response) {
  const pathname = path.normalize(parse(request.url).pathname);

  if (pathname === '/') {
    reportRequestHandler(request, response);
  } else {
    response.writeHead(400);
    response.write('400 - Bad request');
    response.end();
  }
}

function reportRequestHandler(request, response) {
  const reportGenerator = new ReportGenerator();
  const html = reportGenerator.generateHTML(lhResults, 'cli');
  response.writeHead(200, {'Content-Type': 'text/html'});
  response.write(html);
  response.end();
}

module.exports = {
  hostExperiment
};
