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
 * Start Server by calling startServer(port).
 *
 * Functionalities:
 *   Host report pages.
 *     Report pages should be stored in ./src/reports
 *     Report pages can be accessed via URL http://localhost:[PORT]/reports/[REPORT_FILENAME]
 */

const http = require('http');
const fs = require('fs');
const parse = require('url').parse;
const path = require('path');
const log = require('../../lighthouse-core/lib/log');

const ROOT = `${__dirname}/src`;
const FOLDERS = {
  REPORTS: `${ROOT}/reports`
};

const server = http.createServer(requestHandler);
server.on('error', err => log.error('PerformanceXServer', err.code, err));

function requestHandler(request, response) {
  const pathname = parse(request.url).pathname;

  // Only files inside src are accessible
  const filePath = (path.normalize(pathname).startsWith('../')) ? '' : `${ROOT}${pathname}`;
  fs.readFile(filePath, 'binary', readFileCallback);

  function readFileCallback(err, file) {
    if (err) {
      if (err.code === 'ENOENT') {
        sendResponse(404, `404 - File not found. ${pathname}`);
        return;
      }
      log.error('PerformanceXServer', `Unable to read local file ${filePath}:`, err);
      sendResponse(500, '500 - Internal Server Error');
      return;
    }
    sendResponse(200, file);
  }

  function sendResponse(statusCode, data) {
    let headers;
    if (filePath) {
      if (filePath.endsWith('.html')) {
        headers = {'Content-Type': 'text/html'};
      } else if (filePath.endsWith('.json')) {
        headers = {'Content-Type': 'text/json'};
      } else if (filePath.endsWith('.ico')) {
        headers = {'Content-Type': 'image/x-icon'};
      }
    }
    response.writeHead(statusCode, headers);
    response.write(data, 'binary');
    response.end();
  }
}

function prepareServer() {
  for (const folder in FOLDERS) {
    if (!FOLDERS.hasOwnProperty(folder)) {
      continue;
    }

    // Create dirs synchronously. Dirs need to be created before server start.
    const folderPath = FOLDERS[folder];
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
  }
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
      prepareServer();
      server.listen(port, _ => resolve(server.address().port));
    });
  }
  return portPromise;
}

module.exports = {
  startServer,
  FOLDERS
};
