/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const opn = require('opn');
const args = require('yargs')
  .default('runs', 1)
  .argv;

const Metrics = require('../../lighthouse-core/lib/traces/pwmetrics-events');

const constants = require('../constants');
const utils = require('../utils');

/**
 * Do a comparison analysis of two batches of runs. This helps you compare how a change in
 * lighthouse can affect perf results in real-world sites.
 *
 * Example usage:
 * node analyze.js -a ./out-first -b ./out-second
 */
function main() {
  const outPathA = args.a;
  const outPathB = args.b;

  if (!utils.isDir(outPathA) || !utils.isDir(outPathB)) {
    console.log('ERROR: Make sure both -a and -b point to valid paths'); // eslint-disable-line no-console
    console.log('a: ', outPathA); // eslint-disable-line no-console
    console.log('b: ', outPathB); // eslint-disable-line no-console
    return;
  }

  const aggregatedScreenshots = {
    data: aggregate(outPathA, outPathB),
    a: outPathA,
    b: outPathB
  };

  if (!utils.isDir(constants.OUT_PATH)) {
    fs.mkdirSync(constants.OUT_PATH);
  }
  const outFilePath = path.resolve(constants.OUT_PATH, 'screenshotsComparison.js');
  fs.writeFileSync(
    outFilePath,
    `var aggregatedScreenshots = ${JSON.stringify(aggregatedScreenshots, undefined, 2)}`
  );
  console.log('Wrote output to:', outFilePath); // eslint-disable-line no-console
  console.log('Opening the screenshot viewer web page...');  // eslint-disable-line no-console
  opn(path.resolve(__dirname, 'index.html'));
}

main();

/**
 * Aggregates the results from two out paths.
 * Note: only the first run for each site of each batch is used.
 * @param {string} outPathA
 * @param {string} outPathB
 * @return {!AggregatedScreenshots}
 */
function aggregate(outPathA, outPathB) {
  const results = [];

  fs.readdirSync(outPathA).forEach(siteDir => {
    const sitePathA = path.resolve(outPathA, siteDir);
    const sitePathB = path.resolve(outPathB, siteDir);

    // Skip a site if it's not in both batches.
    if (!utils.isDir(sitePathB)) {
      return;
    }

    for (let i = 0; i < args.runs; i++) {
      const runDirA = getRunDir(sitePathA, i);
      const runDirB = getRunDir(sitePathB, i);

      const runPathA = path.resolve(sitePathA, runDirA);
      const runPathB = path.resolve(sitePathB, runDirB);

      const lighthouseFileA = path.resolve(runPathA, constants.LIGHTHOUSE_RESULTS_FILENAME);
      const lighthouseFileB = path.resolve(runPathB, constants.LIGHTHOUSE_RESULTS_FILENAME);

      if (!utils.isFile(lighthouseFileA) || !utils.isFile(lighthouseFileB)) {
        continue;
      }

      const siteScreenshotsComparison = {
        siteName: `${siteDir} runA: ${runDirA} runB: ${runDirB}`,
        runA: analyzeSingleRunScreenshots(runPathA),
        runB: analyzeSingleRunScreenshots(runPathB),
      };
      results.push(siteScreenshotsComparison);
    }
  });

  return results;
}

/**
 * @param {string} sitePath
 * @param {number} runIndex
 * @return {string}
 */
function getRunDir(sitePath, runIndex) {
  return sortAndFilterRunFolders(fs.readdirSync(sitePath))[runIndex];
}

/**
 * @param {!Array<string>} folders
 * @return {!Array<string>}
 */
function sortAndFilterRunFolders(folders) {
  return folders
    .filter(folder => folder !== '.DS_Store')
    .sort((a, b) => Number(a) - Number(b));
}

/**
 * Analyzes the screenshots for the first run of a particular site.
 * @param {string} runPath
 * @return {!SingleRunScreenshots}
 */
function analyzeSingleRunScreenshots(runPath) {
  const lighthouseResultsPath = path.resolve(runPath, constants.LIGHTHOUSE_RESULTS_FILENAME);
  const lighthouseResults = JSON.parse(fs.readFileSync(lighthouseResultsPath));

  const fcpTiming = getTiming('ttfcp');
  const fmpTiming = getTiming('ttfmp');
  const vc85Timing = getTiming('vc85');
  const vc100Timing = getTiming('vc100');

  const navStartTimestamp = getTimestamp('navstart');

  const screenshotsPath = path.resolve(runPath, constants.SCREENSHOTS_FILENAME);
  const screenshots = JSON.parse(fs.readFileSync(screenshotsPath)).map(screenshot => ({
    timing: Math.round(screenshot.timestamp - navStartTimestamp),
    datauri: screenshot.datauri
  }));

  const results = {
    runName: runPath,
    screenshots
  };

  markScreenshots(results, 'isFCP', fcpTiming);
  markScreenshots(results, 'isFMP', fmpTiming);
  markScreenshots(results, 'isVC85', vc85Timing);
  markScreenshots(results, 'isVC100', vc100Timing);

  return results;

  /**
   * @param {string} id
   * @return {number}
   */
  function getTiming(id) {
    return Metrics.metricsDefinitions
      .find(metric => metric.id === id)
      .getTiming(lighthouseResults.audits);
  }

  /**
   * @param {string} id
   * @return {number}
   */
  function getTimestamp(id) {
    return Metrics.metricsDefinitions
      .find(metric => metric.id === id)
      .getTs(lighthouseResults.audits) / 1000; // convert to ms
  }
}

/**
 * Marks the first screenshot that happens after a particular perf timing.
 * @param {SingleRunScreenshots} results
 * @param {string} key
 * @param {number} timing
 */
function markScreenshots(results, key, timing) {
  let hasSeenKeyTiming = false;
  for (const screenshot of results.screenshots) {
    if (!hasSeenKeyTiming && screenshot.timing > timing) {
      hasSeenKeyTiming = true;
      screenshot[key] = true;
    } else {
      screenshot[key] = false;
    }
  }
}

/**
 * @typedef {{
 *   data: !Array<!SiteScreenshotsComparison>,
 *   a: string,
 *   b: string
 * }}
 */
let AggregatedScreenshots; // eslint-disable-line no-unused-vars

/**
 * @typedef {{
 *   siteName: string,
 *   runA: !SingleRunScreenshots,
 *   runB: !SingleRunScreenshots
 * }}
 */
let SiteScreenshotsComparison; // eslint-disable-line no-unused-vars

/**
 * @typedef {{runName: string, screenshots: !Array<!Screenshot>}}
 */
let SingleRunScreenshots; // eslint-disable-line no-unused-vars

/**
 * @typedef {{
 *   datauri: string,
 *   timing: number,
 *   isFCP: boolean,
 *   isFMP: boolean,
 *   isVC85: boolean,
 *   isVC100: boolean
 * }}
 */
let Screenshot; // eslint-disable-line no-unused-vars
