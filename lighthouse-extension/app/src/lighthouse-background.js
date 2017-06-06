/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ExtensionProtocol = require('../../../lighthouse-core/gather/connections/extension');
const RawProtocol = require('../../../lighthouse-core/gather/connections/raw');
const Runner = require('../../../lighthouse-core/runner');
const Config = require('../../../lighthouse-core/config/config');
const defaultConfig = require('../../../lighthouse-core/config/default.js');
const log = require('../../../lighthouse-core/lib/log');

const ReportGeneratorV2 = require('../../../lighthouse-core/report/v2/report-generator');

const STORAGE_KEY = 'lighthouse_audits';
const SETTINGS_KEY = 'lighthouse_settings';

// let installedExtensions = [];
let disableExtensionsDuringRun = false;
let lighthouseIsRunning = false;
let latestStatusLog = [];

// /**
//  * Enables or disables all other installed chrome extensions. The initial list
//  * of the user's extension is created when the background page is started.
//  * @param {!boolean} enable If true, enables all other installed extensions.
//  *     False disables them.
//  * @param {!Promise}
//  */
// function enableOtherChromeExtensions(enable) {
//   if (!disableExtensionsDuringRun) {
//     return Promise.resolve();
//   }

//   const str = enable ? 'enabling' : 'disabling';
//   log.log('Chrome', `${str} ${installedExtensions.length} extensions.`);

//   return Promise.all(installedExtensions.map(info => {
//     return new Promise((resolve, reject) => {
//       chrome.management.setEnabled(info.id, enable, _ => {
//         if (chrome.runtime.lastError) {
//           reject(chrome.runtime.lastError);
//         }
//         resolve();
//       });
//     });
//   }));
// }

/**
 * Sets the extension badge text.
 * @param {string=} optUrl If present, sets the badge text to "Testing <url>".
 *     Otherwise, restore the default badge text.
 */
function updateBadgeUI(optUrl) {
  if (window.chrome && chrome.runtime) {
    const manifest = chrome.runtime.getManifest();

    let title = manifest.browser_action.default_title;
    let path = manifest.browser_action.default_icon['38'];

    if (lighthouseIsRunning) {
      title = `Testing ${optUrl}`;
      path = 'images/lh_logo_icon_light.png';
    }

    chrome.browserAction.setTitle({title});
    chrome.browserAction.setIcon({path});
  }
}

/**
 * Removes artifacts from the result object for portability
 * @param {!Object} result Lighthouse results object
 */
function filterOutArtifacts(result) {
  // strip them out, as the networkRecords artifact has circular structures
  result.artifacts = undefined;
}

/**
 * @param {!Connection} connection
 * @param {string} url
 * @param {!Object} options Lighthouse options.
 * @param {!Array<string>} categoryIDs Name values of categories to include.
 * @return {!Promise}
 */
window.runLighthouseForConnection = function(connection, url, options, categoryIDs) {
  const config = new Config({
    extends: 'lighthouse:default',
    settings: {onlyCategories: categoryIDs},
  });

  // Add url and config to fresh options object.
  const runOptions = Object.assign({}, options, {url, config});

  lighthouseIsRunning = true;
  updateBadgeUI(url);

  return Runner.run(connection, runOptions) // Run Lighthouse.
    .then(result => {
      lighthouseIsRunning = false;
      updateBadgeUI();
      return result;
    })
    .catch(err => {
      lighthouseIsRunning = false;
      updateBadgeUI();
      throw err;
    });
};

/**
 * @param {!Object} options Lighthouse options.
 * @param {!Array<string>} categoryIDs Name values of categories to include.
 * @return {!Promise}
 */
window.runLighthouseInExtension = function(options, categoryIDs) {
  // Default to 'info' logging level.
  log.setLevel('info');
  const connection = new ExtensionProtocol();
  // return enableOtherChromeExtensions(false)
    // .then(_ => connection.getCurrentTabURL())
  return connection.getCurrentTabURL()
    .then(url => window.runLighthouseForConnection(connection, url, options, categoryIDs))
    .then(results => {
      filterOutArtifacts(results);
      // return enableOtherChromeExtensions(true).then(_ => {
      const blobURL = window.createReportPageAsBlob(results, 'extension');
      chrome.tabs.create({url: blobURL});
      // });
    }).catch(err => {
      // return enableOtherChromeExtensions(true).then(_ => {
      throw err;
      // });
    });
};

/**
 * @param {!RawProtocol.Port} port
 * @param {string} url
 * @param {!Object} options Lighthouse options.
 * @param {!Array<string>} categoryIDs Name values of categories to include.
 * @return {!Promise}
 */
window.runLighthouseInWorker = function(port, url, options, categoryIDs) {
  // Default to 'info' logging level.
  log.setLevel('info');
  const connection = new RawProtocol(port);
  return window.runLighthouseForConnection(connection, url, options, categoryIDs);
};

/**
 * @param {!Object} results Lighthouse results object
 * @param {!string} reportContext Where the report is going
 * @return {!string} Blob URL of the report (or error page) HTML
 */
window.createReportPageAsBlob = function(results) {
  performance.mark('report-start');
  const html = new ReportGeneratorV2().generateReportHtml(results);

  const blob = new Blob([html], {type: 'text/html'});
  const blobURL = window.URL.createObjectURL(blob);

  performance.mark('report-end');
  performance.measure('generate report', 'report-start', 'report-end');
  return blobURL;
};

/**
 * Returns list of top-level categories from the default config.
 * @return {!Array<{name: string, id: string}>}
 */
window.getDefaultCategories = function() {
  return Config.getCategories(defaultConfig);
};

/**
 * Save currently selected set of category categories to local storage.
 * @param {{selectedCategories: !Array<string>, disableExtensions: boolean}} settings
 */
window.saveSettings = function(settings) {
  const storage = {
    [STORAGE_KEY]: {},
    [SETTINGS_KEY]: {}
  };

  // Stash selected categories.
  window.getDefaultCategories().forEach(category => {
    storage[STORAGE_KEY][category.id] = settings.selectedCategories.includes(category.id);
  });

  // Stash disable extensions setting.
  disableExtensionsDuringRun = settings.disableExtensions;
  storage[SETTINGS_KEY].disableExtensions = disableExtensionsDuringRun;

  // Save object to chrome local storage.
  chrome.storage.local.set(storage);
};

/**
 * Load selected category categories from local storage.
 * @return {!Promise<{selectedCategories: !Object<boolean>, disableExtensions: boolean}>}
 */
window.loadSettings = function() {
  return new Promise(resolve => {
    // Protip: debug what's in storage with:
    //   chrome.storage.local.get(['lighthouse_audits'], console.log)
    chrome.storage.local.get([STORAGE_KEY, SETTINGS_KEY], result => {
      // Start with list of all default categories set to true so list is
      // always up to date.
      const defaultCategories = {};
      window.getDefaultCategories().forEach(category => {
        defaultCategories[category.id] = true;
      });

      // Load saved categories and settings, overwriting defaults with any
      // saved selections.
      const savedCategories = Object.assign(defaultCategories, result[STORAGE_KEY]);

      const defaultSettings = {
        disableExtensions: disableExtensionsDuringRun
      };
      const savedSettings = Object.assign(defaultSettings, result[SETTINGS_KEY]);

      resolve({
        selectedCategories: savedCategories,
        disableExtensions: savedSettings.disableExtensions
      });
    });
  });
};

window.listenForStatus = function(callback) {
  log.events.addListener('status', function(log) {
    latestStatusLog = log;
    callback(log);
  });

  // Show latest saved status log to give immediate feedback
  // when reopening the popup message when lighthouse is running
  if (lighthouseIsRunning && latestStatusLog) {
    callback(latestStatusLog);
  }
};

window.isRunning = function() {
  return lighthouseIsRunning;
};

// Run when in extension context, but not in devtools.
if (window.chrome && chrome.runtime) {
  // Get list of installed extensions that are enabled and can be disabled.
  // Extensions are not allowed to be disabled if they are under an admin policy.
  // chrome.management.getAll(installs => {
  //   chrome.management.getSelf(lighthouseCrxInfo => {
  //     installedExtensions = installs.filter(info => {
  //       return info.id !== lighthouseCrxInfo.id && info.type === 'extension' &&
  //              info.enabled && info.mayDisable;
  //     });
  //   });
  // });

  chrome.runtime.onInstalled.addListener(details => {
    if (details.previousVersion) {
      // eslint-disable-next-line no-console
      console.log('previousVersion', details.previousVersion);
    }
  });
}
