/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
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
const log = require('../../lighthouse-core/lib/log.js');
const stringifySafe = require('json-stringify-safe');

function getFilenamePrefix(options) {
  const url = options.url;
  const hostname = url.match(/^.*?\/\/(.*?)(:?\/|$)/)[1];

  const date = options.date || new Date();
  const resolvedLocale = new Intl.DateTimeFormat().resolvedOptions().locale;
  const time = date.toLocaleTimeString(resolvedLocale, {hour12: false});
  const timeStampStr = date.toISOString().replace(/T.*/, '_' + time);

  const filenamePrefix = hostname + '_' + timeStampStr;
  // replace characters that are unfriendly to filenames
  return (filenamePrefix).replace(/[\/\?<>\\:\*\|":]/g, '-');
}

// Some trace events are particularly large, and not only consume a LOT of disk
// space, but also cause problems for the JSON stringifier. For simplicity, we exclude them
function filterForSize(traceData) {
  return traceData.filter(e => e.name !== 'LayoutTree');
}

function screenshotDump(options, screenshots) {
  return `
  <!doctype html>
  <title>screenshots ${getFilenamePrefix(options)}</title>
  <style>
html {
    overflow-x: scroll;
    overflow-y: hidden;
    height: 100%;
    background: linear-gradient(to left, #4CA1AF , #C4E0E5);
    background-attachment: fixed;
    padding: 10px;
}
body {
    white-space: nowrap;
    background: linear-gradient(to left, #4CA1AF , #C4E0E5);
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

// Set to ignore because testing it would imply testing fs, which isn't strictly necessary.
/* istanbul ignore next */
function saveArtifacts(artifacts, filename) {
  const artifactsFilename = filename || 'artifacts.log';
  // The networkRecords artifacts have circular references
  fs.writeFileSync(artifactsFilename, stringifySafe(artifacts));
  log.log('artifacts file saved to disk', artifactsFilename);
}

/**
 * Filter traces and extract screenshots to prepare for saving.
 * @param {!Object} options
 * @param {!Artifacts} artifacts
 * @return {!Promise<!Array<{traceData: !Object, html: string}>>}
 */
function prepareAssets(options, artifacts) {
  const passNames = Object.keys(artifacts.traces);
  const assets = [];

  return passNames.reduce((chain, passName) => {
    const trace = artifacts.traces[passName];

    return chain.then(_ => artifacts.requestScreenshots(trace))
      .then(screenshots => {
        const traceData = Object.assign({}, trace);
        traceData.traceEvents = filterForSize(traceData.traceEvents);
        const html = screenshotDump(options, screenshots);

        assets.push({
          traceData,
          html
        });
      });
  }, Promise.resolve())
    .then(_ => assets);
}

/**
 * Writes trace(s) and associated screenshot(s) to disk.
 * @param {!Object} options
 * @param {!Artifacts} artifacts
 * @return {!Promise}
 */
function saveAssets(options, artifacts) {
  return prepareAssets(options, artifacts).then(assets => {
    assets.forEach((data, index) => {
      const filenamePrefix = getFilenamePrefix(options);

      const traceData = data.traceData;
      fs.writeFileSync(`${filenamePrefix}-${index}.trace.json`, JSON.stringify(traceData, null, 2));
      log.log('trace file saved to disk', filenamePrefix);

      fs.writeFileSync(`${filenamePrefix}-${index}.screenshots.html`, data.html);
      log.log('screenshots saved to disk', filenamePrefix);
    });
  });
}

module.exports = {
  saveArtifacts,
  saveAssets,
  getFilenamePrefix,
  prepareAssets
};
