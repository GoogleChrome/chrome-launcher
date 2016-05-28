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

const log = require('./lib/log.js');
const screenshotDump = require('./lib/screenshot-page.js');
const Gather = require('./gatherers/gather.js');
const stringify = require('json-stringify-safe');

function loadPage(driver, gatherers, options) {
  const loadPage = options.flags.loadPage;
  const url = options.url;

  if (loadPage) {
    return driver.gotoURL(url, {waitForLoad: true});
  }

  return Promise.resolve();
}

function reloadPage(driver, options) {
  // Since a Page.reload command does not let a service worker take over, we
  // navigate away and then come back to reload. We do not `waitForLoad` on
  // about:blank since a page load event is never fired on it.
  return driver.gotoURL('about:blank')
    // Wait a bit for about:blank to "take hold" before switching back to the page.
    .then(_ => new Promise((resolve, reject) => setTimeout(resolve, 300)))
    .then(_ => driver.gotoURL(options.url, {waitForLoad: true}));
}

function setupDriver(driver, gatherers, options) {
  return new Promise((resolve, reject) => {
    // Enable emulation.
    if (options.flags.mobile) {
      return resolve(driver.beginEmulation());
    }

    // noop if no mobile emulation
    resolve();
  }).then(_ => {
    return driver.cleanAndDisableBrowserCaches();
  }).then(_ => {
    // Force SWs to update on load.
    return driver.forceUpdateServiceWorkers();
  });
}

// Enable tracing and network record collection.
function beginPassiveCollection(driver) {
  return driver.beginTrace()
    .then(_ => driver.beginNetworkCollect());
}

function endPassiveCollection(options, tracingData) {
  const driver = options.driver;
  return driver.endNetworkCollect().then(networkRecords => {
    tracingData.networkRecords = networkRecords;
  }).then(_ => {
    return driver.endTrace();
  }).then(traceContents => {
    tracingData.traceContents = traceContents;
  });
}

function phaseRunner(gatherers) {
  return function runPhase(gatherFun) {
    return gatherers.reduce((chain, gatherer) => {
      return chain.then(_ => gatherFun(gatherer));
    }, Promise.resolve());
  };
}

function saveArtifacts(artifacts) {
  const artifactsFilename = 'artifacts.log';
  fs.writeFileSync(artifactsFilename, stringify(artifacts));
  log.log('info', 'artifacts file saved to disk', artifactsFilename);
}

function getAssetFilename(assetName, url) {
  const date = new Date();
  const hostname = url.match(/^.*?\/\/(.*?)(:?\/|$)/)[1];
  const filenamePrefix = hostname + '_' + date.toISOString();
  return (filenamePrefix + assetName).replace(/[\/\?<>\\:\*\|":]/g, '-');
}

function saveAssets(options, artifacts) {
  const url = options.url;
  const traceFilename = getAssetFilename('.trace.json', url);

  fs.writeFileSync(traceFilename, stringify(artifacts.traceContents, null, 2));
  log.log('info', 'trace file saved to disk', traceFilename);

  const screenshotsFilename = getAssetFilename('.screenshots.html', url);
  const html = screenshotDump(screenshotsFilename, artifacts.screenshots);
  fs.writeFileSync(screenshotsFilename, html);
  log.log('info', 'screenshots saved to disk', screenshotsFilename);
}

function shouldRunPass(gatherers, phases) {
  return phases.reduce((shouldRun, phase) => {
    return shouldRun || gatherers.some(gatherer => gatherer[phase] !== Gather.prototype[phase]);
  }, false);
}

function firstPass(driver, gatherers, options, tracingData) {
  const runPhase = phaseRunner(gatherers);

  return runPhase(gatherer => gatherer.setup(options))
    .then(_ => beginPassiveCollection(driver))
    .then(_ => runPhase(gatherer => gatherer.beforePageLoad(options)))

    // Load page, gather from browser, stop profilers.
    .then(_ => loadPage(driver, gatherers, options))
    .then(_ => runPhase(gatherer => gatherer.profiledPostPageLoad(options)))
    .then(_ => endPassiveCollection(options, tracingData))
    .then(_ => runPhase(gatherer => gatherer.postProfiling(options, tracingData)));
}

function secondPass(driver, gatherers, options) {
  const phases = ['reloadSetup', 'beforeReloadPageLoad', 'afterReloadPageLoad'];
  if (!shouldRunPass(gatherers, phases)) {
    return Promise.resolve();
  }

  const runPhase = phaseRunner(gatherers);

  // Reload page for SW, etc.
  return runPhase(gatherer => gatherer.reloadSetup(options))
    .then(_ => runPhase(gatherer => gatherer.beforeReloadPageLoad(options)))
    .then(_ => reloadPage(driver, options))
    .then(_ => runPhase(gatherer => gatherer.afterReloadPageLoad(options)));
}

function thirdPass(driver, gatherers, options) {
  if (!shouldRunPass(gatherers, ['afterSecondReloadPageLoad'])) {
    return Promise.resolve();
  }

  const runPhase = phaseRunner(gatherers);

  // Reload page again for HTTPS redirect
  options.url = options.url.replace(/^https/, 'http');
  return reloadPage(driver, options)
    .then(_ => runPhase(gatherer => gatherer.afterSecondReloadPageLoad(options)));
}

function run(gatherers, options) {
  const driver = options.driver;
  const tracingData = {};

  if (typeof options.url !== 'string' || options.url.length === 0) {
    return Promise.reject(new Error('You must provide a url to scheduler'));
  }

  const runPhase = phaseRunner(gatherers);

  return driver.connect()
    .then(_ => setupDriver(driver, gatherers, options))

    .then(_ => firstPass(driver, gatherers, options, tracingData))
    .then(_ => secondPass(driver, gatherers, options))
    .then(_ => thirdPass(driver, gatherers, options))

    // Finish and teardown.
    .then(_ => driver.disconnect())
    .then(_ => runPhase(gatherer => gatherer.tearDown(options)))
    .then(_ => {
      // Collate all the gatherer results.
      const artifacts = gatherers.reduce((artifacts, gatherer) => {
        artifacts[gatherer.name] = gatherer.artifact;
        return artifacts;
      }, {
        networkRecords: tracingData.networkRecords,
        traceContents: tracingData.traceContents
      });

      if (options.flags.saveArtifacts) {
        saveArtifacts(artifacts);
      }
      if (options.flags.saveAssets) {
        saveAssets(options, artifacts);
      }

      return artifacts;
    });
}

module.exports = {
  loadPage,
  reloadPage,
  setupDriver,
  beginPassiveCollection,
  endPassiveCollection,
  phaseRunner,
  run
};
