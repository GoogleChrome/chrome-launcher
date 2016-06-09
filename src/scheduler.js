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

const assetSaver = require('./lib/asset-saver.js');

function loadPage(driver, options) {
  // Since a Page.reload command does not let a service worker take over, we
  // navigate away and then come back to reload. We do not `waitForLoad` on
  // about:blank since a page load event is never fired on it.
  return driver.gotoURL('about:blank')
    // Wait a bit for about:blank to "take hold" before switching back to the page.
    .then(_ => new Promise((resolve, reject) => setTimeout(resolve, 300)))
    .then(_ => driver.gotoURL(options.url, {
      waitForLoad: true, disableJavaScript: !!options.disableJavaScript
    }));
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

function setup(options) {
  const driver = options.driver;
  const config = options.config;
  const gatherers = config.gatherers;
  let pass = Promise.resolve();

  if (config.trace) {
    pass = pass.then(_ => driver.beginTrace());
  }

  if (config.network) {
    pass = pass.then(_ => driver.beginNetworkCollect());
  }

  return gatherers.reduce((chain, gatherer) => {
    return chain.then(_ => gatherer.setup(options));
  }, pass);
}

function beforePass(options) {
  const config = options.config;
  const gatherers = config.gatherers;

  return gatherers.reduce((chain, gatherer) => {
    return chain.then(_ => {
      return gatherer.beforePass(options);
    });
  }, Promise.resolve());
}

function pass(options) {
  const driver = options.driver;
  const config = options.config;
  const gatherers = config.gatherers;
  let pass = Promise.resolve();

  if (config.loadPage) {
    pass = pass.then(_ => loadPage(driver, options));
  }

  return gatherers.reduce((chain, gatherer) => {
    return chain.then(_ => gatherer.pass(options));
  }, pass);
}

function afterPass(options) {
  const driver = options.driver;
  const config = options.config;
  const gatherers = config.gatherers;
  const loadData = {};
  let pass = Promise.resolve();

  if (config.trace) {
    pass = pass.then(_ => driver.endTrace().then(traceContents => {
      loadData.traceContents = traceContents;
    }));
  }

  if (config.network) {
    pass = pass.then(_ => driver.endNetworkCollect().then(networkRecords => {
      loadData.networkRecords = networkRecords;
    }));
  }

  return gatherers
      .reduce((chain, gatherer) => {
        return chain.then(_ => gatherer.afterPass(options, loadData));
      }, pass)
      .then(_ => loadData);
}

function tearDown(options) {
  const config = options.config;
  const gatherers = config.gatherers;
  return gatherers.reduce((chain, gatherer) => {
    return chain.then(_ => gatherer.tearDown(options));
  }, Promise.resolve());
}

function run(passes, options) {
  const driver = options.driver;
  const tracingData = {};

  if (typeof options.url !== 'string' || options.url.length === 0) {
    return Promise.reject(new Error('You must provide a url to scheduler'));
  }

  return driver.connect()
    .then(_ => setupDriver(driver, 1, options))

    // Run each pass
    .then(_ => {
      return passes.reduce((chain, config) => {
        const runOptions = Object.assign({}, options, {config});
        return chain
            .then(_ => setup(runOptions))
            .then(_ => beforePass(runOptions))
            .then(_ => pass(runOptions))
            .then(_ => afterPass(runOptions))
            .then(loadData => {
              Object.assign(tracingData, loadData);
            })
            .then(_ => tearDown(runOptions));
      }, Promise.resolve());
    })

    // Reload the page to remove any side-effects of Lighthouse (like disabling JavaScript).
    .then(_ => loadPage(driver, options))

     // Finish and teardown.
    .then(_ => driver.disconnect())
    .then(_ => {
      // Collate all the gatherer results.
      const artifacts = Object.assign({}, tracingData);
      passes.forEach(pass => {
        pass.gatherers.forEach(gatherer => {
          artifacts[gatherer.name] = gatherer.artifact;
        });
      });

      // Ignoring these two flags since this functionality is not exposed by the module.
      /* istanbul ignore next */
      if (options.flags.saveArtifacts) {
        assetSaver.saveArtifacts(artifacts);
      }

      if (options.flags.saveAssets) {
        assetSaver.saveAssets(options, artifacts);
      }

      return artifacts;
    });
}

module.exports = {
  run,
  loadPage,
  setupDriver,
  setup,
  afterPass
};
