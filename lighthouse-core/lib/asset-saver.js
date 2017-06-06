/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const log = require('../../lighthouse-core/lib/log.js');
const stringifySafe = require('json-stringify-safe');
const Metrics = require('./traces/pwmetrics-events');

/**
 * Generate basic HTML page of screenshot filmstrip
 * @param {!Array<{timestamp: number, datauri: string}>} screenshots
 * @return {!string}
 */
function screenshotDump(screenshots) {
  return `
  <!doctype html>
  <meta charset="utf-8">
  <title>screenshots</title>
  <style>
html {
    overflow-x: scroll;
    overflow-y: hidden;
    height: 100%;
    background-image: linear-gradient(to left, #4ca1af , #c4e0e5);
    background-attachment: fixed;
    padding: 10px;
}
body {
    white-space: nowrap;
    background-image: linear-gradient(to left, #4ca1af , #c4e0e5);
    width: 100%;
    margin: 0;
}
img {
    margin: 4px;
}
</style>
  <body>
    <script>
      var shots = ${JSON.stringify(screenshots)};

  shots.forEach(s => {
    var i = document.createElement('img');
    i.src = s.datauri;
    i.title = s.timestamp;
    document.body.appendChild(i);
  });
  </script>
  `;
}

/**
 * Save entire artifacts object to a single stringified file located at
 * pathWithBasename + .artifacts.log
 * @param {!Artifacts} artifacts
 * @param {string} pathWithBasename
 */
// Set to ignore because testing it would imply testing fs, which isn't strictly necessary.
/* istanbul ignore next */
function saveArtifacts(artifacts, pathWithBasename) {
  const fullPath = `${pathWithBasename}.artifacts.log`;
  // The networkRecords artifacts have circular references
  fs.writeFileSync(fullPath, stringifySafe(artifacts));
  log.log('artifacts file saved to disk', fullPath);
}

/**
 * Filter traces and extract screenshots to prepare for saving.
 * @param {!Artifacts} artifacts
 * @param {!Audits} audits
 * @return {!Promise<!Array<{traceData: !Object, html: string}>>}
 */
function prepareAssets(artifacts, audits) {
  const passNames = Object.keys(artifacts.traces);
  const assets = [];

  return passNames.reduce((chain, passName) => {
    const trace = artifacts.traces[passName];
    const devtoolsLog = artifacts.devtoolsLogs[passName];

    return chain.then(_ => artifacts.requestScreenshots(trace))
      .then(screenshots => {
        const traceData = Object.assign({}, trace);
        const screenshotsHTML = screenshotDump(screenshots);

        if (audits) {
          const evts = new Metrics(traceData.traceEvents, audits).generateFakeEvents();
          traceData.traceEvents.push(...evts);
        }
        assets.push({
          traceData,
          devtoolsLog,
          screenshotsHTML,
          screenshots
        });
      });
  }, Promise.resolve())
    .then(_ => assets);
}

/**
 * Writes trace(s) and associated screenshot(s) to disk.
 * @param {!Artifacts} artifacts
 * @param {!Audits} audits
 * @param {string} pathWithBasename
 * @return {!Promise}
 */
function saveAssets(artifacts, audits, pathWithBasename) {
  return prepareAssets(artifacts, audits).then(assets => {
    assets.forEach((data, index) => {
      const traceFilename = `${pathWithBasename}-${index}.trace.json`;
      fs.writeFileSync(traceFilename, JSON.stringify(data.traceData, null, 2));
      log.log('trace file saved to disk', traceFilename);

      const devtoolsLogFilename = `${pathWithBasename}-${index}.devtoolslog.json`;
      fs.writeFileSync(devtoolsLogFilename, JSON.stringify(data.devtoolsLog, null, 2));
      log.log('devtools log saved to disk', devtoolsLogFilename);

      const screenshotsHTMLFilename = `${pathWithBasename}-${index}.screenshots.html`;
      fs.writeFileSync(screenshotsHTMLFilename, data.screenshotsHTML);
      log.log('screenshots saved to disk', screenshotsHTMLFilename);

      const screenshotsJSONFilename = `${pathWithBasename}-${index}.screenshots.json`;
      fs.writeFileSync(screenshotsJSONFilename, JSON.stringify(data.screenshots, null, 2));
      log.log('screenshots saved to disk', screenshotsJSONFilename);
    });
  });
}

module.exports = {
  saveArtifacts,
  saveAssets,
  prepareAssets
};
