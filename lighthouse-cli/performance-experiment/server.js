/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Server script for Project Performance Experiment.
 *
 * Functionality:
 *    Host experiment.
 *    Report can be access via URL: /?id=[REPORT_ID]
 *    Browser can request lighthousr rerun by sending POST request to URL: /rerun?id=[REPORT_ID]
 *      This will rerun lighthouse with additional cli-flags received from POST request data and
 *      return the new report id
 */

const http = require('http');
const parse = require('url').parse;

const log = require('../../lighthouse-core/lib/log');
const lighthouse = require('../../lighthouse-core');
const ExperimentDatabase = require('./experiment-database/database');
const PerfXReportGenerator = require('./report/perf-x-report-generator');
const opn = require('../shim-modules').opn;

let database;
let fallbackReportId;
let url;
let config;
/**
 * Start the server with an arbitrary port and open report page in the default browser.
 * @param {!Object} params A JSON contains lighthouse parameters
 * @param {!Object} results
 * @return {!Promise<string>} Promise that resolves when server is closed
 */
function hostExperiment(params, results) {
  return new Promise(resolve => {
    url = params.url;
    config = params.config;

    database = new ExperimentDatabase();
    const id = database.saveData(params.flags, results);
    fallbackReportId = id;

    const server = http.createServer(requestHandler);
    server.listen(0);
    server.on('listening', () => opn(`http://localhost:${server.address().port}/?id=${id}`));
    server.on('error', err => log.error('PerformanceXServer', err.code, err));
    server.on('close', resolve);
    process.on('SIGINT', () => {
      database.clear();
      server.close();
    });
  });
}

function requestHandler(request, response) {
  request.parsedUrl = parse(request.url, true);
  const pathname = request.parsedUrl.pathname;
  try {
    if (request.method === 'GET') {
      if (pathname === '/') {
        reportRequestHandler(request, response);
      } else {
        throw new HTTPError(404);
      }
    } else if (request.method === 'POST') {
      if (pathname === '/rerun') {
        rerunRequestHandler(request, response);
      } else {
        throw new HTTPError(404);
      }
    } else {
      throw new HTTPError(405);
    }
  } catch (err) {
    if (err instanceof HTTPError) {
      response.writeHead(err.statusCode);
      response.end(err.message || http.STATUS_CODES[err.statusCode]);
    } else {
      response.writeHead(500);
      response.end(http.STATUS_CODES[500]);
      log.err('PerformanceXServer', err.code, err);
    }
  }
}

function reportRequestHandler(request, response) {
  try {
    const id = request.parsedUrl.query.id || fallbackReportId;

    const reportsMetadata = Object.keys(database.timeStamps).map(key => {
      const generatedTime = database.timeStamps[key];
      return {url, reportHref: `/?id=${key}`, generatedTime};
    });
    reportsMetadata.sort((metadata1, metadata2) => {
      return new Date(metadata1.generatedTime) - new Date(metadata2.generatedTime);
    });
    const reportsCatalog = {reportsMetadata, selectedReportHref: `/?id=${id}`};

    const results = database.getResults(id);
    const perfXReportGenerator = new PerfXReportGenerator();

    response.writeHead(200, {'Content-Type': 'text/html'});
    response.end(perfXReportGenerator.generateHTML(results, 'perf-x', reportsCatalog));
  } catch (err) {
    throw new HTTPError(404);
  }
}

function rerunRequestHandler(request, response) {
  try {
    const flags = database.getFlags(request.parsedUrl.query.id || fallbackReportId);
    let message = '';
    request.on('data', data => message += data);

    request.on('end', () => {
      const additionalFlags = JSON.parse(message);
      Object.assign(flags, additionalFlags);

      lighthouse(url, flags, config).then(results => {
        results.artifacts = undefined;
        const id = database.saveData(flags, results);
        response.writeHead(200);
        response.end(id);
      }).catch(err => {
        log.error('PerformanceXServer', err.code, err);
        response.writeHead(500);
        response.end(http.STATUS_CODES[500]);
      });
    });
  } catch (err) {
    throw new HTTPError(404);
  }
}

class HTTPError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = {
  hostExperiment
};
