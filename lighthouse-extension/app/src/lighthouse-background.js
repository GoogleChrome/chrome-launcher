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

const ExtensionProtocol = require('../../../lighthouse-core/gather/drivers/extension');
const Runner = require('../../../lighthouse-core/runner');
const Config = require('../../../lighthouse-core/config/config');
const defaultConfig = require('../../../lighthouse-core/config/default.json');
const log = require('../../../lighthouse-core/lib/log');

const STORAGE_KEY = 'lighthouse_audits';
const _flatten = arr => [].concat.apply([], arr);

window.createPageAndPopulate = function(results) {
  const tabURL = chrome.extension.getURL('/pages/report.html');
  chrome.tabs.create({url: tabURL}, tab => {
    // Results will be lost when using sendMessage without waiting for the
    // receiving side to load. Once it loads, we get a message -
    // ready=true. Respond to this message with the results.
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
      if (message && message.ready && sender.tab.id === tab.id) {
        return respond(results);
      }
    });
  });
};

/**
 * @param {!Object} options Lighthouse options.
 * @param {!Array<string>} requestedAudits Names of audits to run.
 * @return {!Promise}
 */
window.runLighthouse = function(options, requestedAudits) {
  // Default to 'info' logging level.
  log.setLevel('info');
  const driver = new ExtensionProtocol();

  return driver.getCurrentTabURL()
    .then(url => {
      // Always start with a freshly parsed default config.
      const runConfig = JSON.parse(JSON.stringify(defaultConfig));

      // Filter out audits not requested.
      requestedAudits = new Set(requestedAudits);
      runConfig.audits = runConfig.audits.filter(audit => requestedAudits.has(audit));
      const config = new Config(runConfig);

      // Add url and config to fresh options object.
      const runOptions = Object.assign({}, options, {url, config});

      // Run Lighthouse.
      return Runner.run(driver, runOptions);
    }).catch(e => {
      console.error(e);
      throw e;
    });
};

/**
 * Returns list of aggregation categories (each with a list of its constituent
 * audits) from the default config.
 * @return {!Array<{name: string, audits: !Array<string>}>}
 */
window.getDefaultAggregations = function() {
  return _flatten(
    defaultConfig.aggregations.map(aggregation => {
      if (aggregation.items.length === 1) {
        return {
          name: aggregation.name,
          criteria: aggregation.items[0].criteria,
        };
      }

      return aggregation.items;
    })
  ).map(aggregation => {
    return {
      name: aggregation.name,
      audits: Object.keys(aggregation.criteria)
    };
  });
};

/**
 * Save currently selected set of aggregation categories to local storage.
 * @param {!Array<{name: string, audits: !Array<string>}>} selectedAggregations
 */
window.saveSelectedAggregations = function(selectedAggregations) {
  const storage = {
    [STORAGE_KEY]: {}
  };

  window.getDefaultAggregations().forEach(audit => {
    const selected = selectedAggregations.indexOf(audit.name) > -1;
    storage[STORAGE_KEY][audit.name] = selected;
  });

  chrome.storage.local.set(storage);
};

/**
 * Load selected aggregation categories from local storage.
 * @return {!Promise<!Object<boolean>>}
 */
window.loadSelectedAggregations = function() {
  return new Promise(resolve => {
    chrome.storage.local.get(STORAGE_KEY, result => {
      // Start with list of all default aggregations set to true so list is
      // always up to date.
      const defaultAggregations = {};
      window.getDefaultAggregations().forEach(aggregation => {
        defaultAggregations[aggregation.name] = true;
      });

      // Load saved aggregation selections.
      const savedSelections = result[STORAGE_KEY];

      // Overwrite defaults with any saved aggregation selections.
      resolve(
        Object.assign(defaultAggregations, savedSelections)
      );
    });
  });
};

window.listenForStatus = function(callback) {
  log.events.addListener('status', callback);
};

chrome.runtime.onInstalled.addListener(details => {
  if (details.previousVersion) {
    console.log('previousVersion', details.previousVersion);
  }
});
