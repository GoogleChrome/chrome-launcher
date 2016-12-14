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

const http = require('http');
const path = require('path');
const fs = require('fs');
const parseURL = require('url').parse;

function requestHandler(request, response) {
  const requestUrl = parseURL(request.url);
  const filePath = requestUrl.pathname;
  const queryString = requestUrl.search;
  let absoluteFilePath = path.join(__dirname, filePath);

  if (filePath === '/promise_polyfill.js') {
    // evaluateAsync previously had a bug that LH would fail if a page polyfilled Promise.
    // We bring in a third-party Promise polyfill to ensure we don't still fail.
    const thirdPartyPath = '../../../lighthouse-core/third_party';
    absoluteFilePath = path.join(__dirname, `${thirdPartyPath}/promise-polyfill/promise.js`);
  }

  fs.exists(absoluteFilePath, fsExistsCallback);

  function fsExistsCallback(fileExists) {
    if (!fileExists) {
      return sendResponse(404, `404 - File not found. ${absoluteFilePath}`);
    }
    fs.readFile(absoluteFilePath, 'binary', readFileCallback);
  }

  function readFileCallback(err, file) {
    if (err) {
      console.error(`Unable to read local file ${absoluteFilePath}:`, err);
      return sendResponse(500, '500 - Internal Server Error');
    }
    sendResponse(200, file);
  }

  function sendResponse(statusCode, data) {
    let headers;
    if (filePath.endsWith('.js')) {
      headers = {'Content-Type': 'text/javascript'};
    } else if (filePath.endsWith('.css')) {
      headers = {'Content-Type': 'text/css'};
    }
    response.writeHead(statusCode, headers);

    if (queryString && queryString.includes('delay')) {
      response.write('');
      return setTimeout(finishResponse, 2000, data);
    }
    finishResponse(data);
  }

  function finishResponse(data) {
    response.write(data, 'binary');
    response.end();
  }
}

const serverForOnline = http.createServer(requestHandler);
const serverForOffline = http.createServer(requestHandler);

serverForOnline.on('error', e => console.error(e.code, e));
serverForOffline.on('error', e => console.error(e.code, e));

// Listen
serverForOnline.listen(10200);
serverForOffline.listen(10503);
