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
const configJSON = require('../../../lighthouse-core/config/default.json');
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

window.runAudits = function(options, audits) {
  // Default to 'info' logging level.
  log.setLevel('info');
  const driver = new ExtensionProtocol();

  return driver.getCurrentTabURL()
      .then(url => {
        // Setup the run config, audits are calculated by selected options
        const config = new Config(configJSON, new Set(audits));

        // Add in the URL to the options.
        return Runner.run(driver, Object.assign({}, options, {url, config}));
      }).catch(e => {
        console.error(e);
        throw e;
      });
};

window.getListOfAudits = function() {
  return _flatten(
    configJSON.aggregations.map(aggregation => {
      if (aggregation.items.length === 1) {
        return {
          name: aggregation.name,
          criteria: aggregation.items[0].criteria,
        };
      }

      return aggregation.items;
    })
  );
};

window.saveAudits = function(audits) {
  const listOfAudits = window.getListOfAudits().map(aggregation => aggregation.name);
  let storage = {};
  storage[STORAGE_KEY] = {};

  window.getListOfAudits().forEach(audit => {
    storage[STORAGE_KEY][audit.name] = audits.indexOf(audit.name) > -1;
  });

  chrome.storage.local.set(storage);
};

window.fetchAudits = function() {
  return new Promise(resolve => {
    chrome.storage.local.get(STORAGE_KEY, result => {
      const audits = result[STORAGE_KEY];

      // create list of default audits
      let defaultAudits = {};
      window.getListOfAudits().forEach((audit) => {
        defaultAudits[audit.name] = true;
      });

      // merge default and saved audits together so we always have the latest list of audits
      resolve(
        Object.assign({}, defaultAudits, audits)
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
