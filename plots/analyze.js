/**
 * @license
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
'use strict';

const fs = require('fs');
const path = require('path');

const opn = require('opn');

const constants = require('./constants');
const utils = require('./utils');
const Metrics = require('../lighthouse-core/lib/traces/pwmetrics-events');

const GENERATED_RESULTS_PATH = path.resolve(constants.OUT_PATH, 'generatedResults.js');

/**
 * Analyzes output generated from the measure step and
 * generates a summary file for consumption by chart.js.
 */
function main() {
  const allResults = [];
  fs.readdirSync(constants.OUT_PATH).forEach(siteDir => {
    const sitePath = path.resolve(constants.OUT_PATH, siteDir);
    if (!utils.isDir(sitePath)) {
      return;
    }
    allResults.push({site: siteDir, results: analyzeSite(sitePath)});
  });
  const generatedResults = groupByMetrics(allResults);
  fs.writeFileSync(
    GENERATED_RESULTS_PATH,
    `var generatedResults = ${JSON.stringify(generatedResults)}`
  );
  console.log('Opening the charts web page...');  // eslint-disable-line no-console
  opn(path.resolve(__dirname, 'index.html'));
}

main();

/**
 * Aggregates all the run results for a particular site.
 * @param {string} sitePath
 * @return {!RunResults}
 */
function analyzeSite(sitePath) {
  console.log('Analyzing', sitePath); // eslint-disable-line no-console
  const runResults = [];
  fs.readdirSync(sitePath).forEach(runDir => {
    const resultsPath = path.resolve(sitePath, runDir, constants.LIGHTHOUSE_RESULTS_FILENAME);
    if (!utils.isFile(resultsPath)) {
      return;
    }
    const metrics = readResult(resultsPath);
    console.log(`Metric for ${runDir}: ${JSON.stringify(metrics)}`); // eslint-disable-line no-console
    runResults[runDir] = {
      runId: runDir,
      metrics
    };
  });
  return runResults;
}

/**
 * Extracts the metrics data from a lighthouse json report.
 * @param {string} resultPath
 * @return {!Array<!Metric>}
 */
function readResult(lighthouseReportPath) {
  const data = JSON.parse(fs.readFileSync(lighthouseReportPath));
  return Metrics.metricsDefinitions.map(metric => ({
    name: metric.name,
    id: metric.id,
    timing: metric.getTiming(data.audits)
  }));
}

/**
 * Aggregates site results by performance metric because it's
 * informative to compare a suite of sites for a particular metric.
 * @param {!Array<!SiteResults>} results
 * @return {!ResultsByMetric}
 */
function groupByMetrics(results) {
  return Metrics.metricsDefinitions.map(metric => metric.name).reduce((acc, metricName, index) => {
    acc[metricName] = results.map(siteResult => ({
      site: siteResult.site,
      metrics: siteResult.results.map(runResult => ({
        timing: runResult.metrics[index].timing
      }))
    }));
    return acc;
  }, {});
}

/**
 * @typedef {{site: string, results: !RunResults}}
 */
let SiteResults; // eslint-disable-line no-unused-vars

/**
 * @typedef {!Array<{runId: string, metrics: !Array<!Metric>}>}
 */
let RunResults; // eslint-disable-line no-unused-vars

/**
 * @typedef {{name: string, id: string, timing: number}}
 */
let Metric; // eslint-disable-line no-unused-vars

/**
 * @typedef {!Object<string, !Array<{site: string, metrics: !Array<{timing: number}>}>}
 */
let ResultsByMetric; // eslint-disable-line no-unused-vars
