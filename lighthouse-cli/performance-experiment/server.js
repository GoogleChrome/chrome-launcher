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
const fs = require('fs');
const log = require('../../lighthouse-core/lib/log');
const assetSaver = require('../../lighthouse-core/lib/asset-saver');
const ReportGenerator = require('../../lighthouse-core/report/report-generator');

const ROOT = `${__dirname}/src`;
const server = http.createServer(requestHandler);
server.on('error', err => log.error('PerformanceXServer', err.code, err));

function requestHandler(request, response) {
  request.parsedUrl = parse(request.url, true);
  const pathname = path.normalize(request.parsedUrl.pathname);
  request.parsedUrl.pathname = pathname;

  if (pathname === '/reports') {
    reportRequestHandler(request, response);
  } else {
    response.writeHead(400);
    response.write('400 - Bad request');
    response.end();
  }
}

function reportRequestHandler(request, response) {
  const key = request.parsedUrl.query.key;
  const filePath = `${ROOT}/${key}/results.json`;
  if (fs.existsSync(filePath)) {
    const reportGenerator = new ReportGenerator();
    const results = JSON.parse(fs.readFileSync(filePath));
    const html = reportGenerator.generateHTML(results, 'cli');
    response.writeHead(200, {'Content-Type': 'text/html'});
    response.write(html);
  } else {
    response.writeHead(404);
    response.write(`404 - Report not found. Key = ${key}`);
  }
  response.end();
}

/**
 * Start the server with an arbitrary port if it's not already started.
 * Save experiment configuration (flags) and results
 * @param {!Object} flags
 * @param {!Object} results
 * @return {!Promise<string>} Promise that resolves to the url where report can be accessed
 */
function hostExperiment(flags, results) {
  return startServer(0).then(port => {
    const key = assetSaver.getFilenamePrefix({url: results.initialUrl});
    const dir = `${ROOT}/${key}`;
    fs.mkdirSync(dir);
    fs.writeFileSync(`${dir}/flags.json`, JSON.stringify(flags));
    fs.writeFileSync(`${dir}/results.json`, JSON.stringify(results));
    log.log('PerformanceXServer', 'Save experiment data:', `file path: ${dir}`);
    return `http://localhost:${port}/reports?key=${key}`;
  });
}

/**
 * Start the server if it's not already started.
 * @param {number} port
 * @return {!Promise<number>} Promise that resolves to port the server is listening to
 */
let portPromise;
function startServer(port) {
  if (!portPromise) {
    portPromise = new Promise(resolve => {
      if (!fs.existsSync(ROOT)) {
        fs.mkdirSync(ROOT);
      }
      server.listen(port, () => resolve(server.address().port));
    });
  }
  return portPromise;
}

module.exports = {
  hostExperiment,
  startServer
};
