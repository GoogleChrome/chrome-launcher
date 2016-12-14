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

const ExtensionProtocol = require('../../../lighthouse-core/gather/connections/extension');
const RawProtocol = require('../../../lighthouse-core/gather/connections/raw');
const Runner = require('../../../lighthouse-core/runner');
const Config = require('../../../lighthouse-core/config/config');
const defaultConfig = require('../../../lighthouse-core/config/default.json');
const log = require('../../../lighthouse-core/lib/log');

const ReportGenerator = require('../../../lighthouse-core/report/report-generator');

const STORAGE_KEY = 'lighthouse_audits';
const _flatten = arr => [].concat(...arr);

/**
 * Filter out any unrequested aggregations from the config. If any audits are
 * no longer needed by any remaining aggregations, filter out those as well.
 * @param {!Object} config Lighthouse config object.
 * @param {!Object<boolean>} requestedAggregations
 */
function filterConfig(config, requestedAggregations) {
  config.aggregations = config.aggregations.filter(aggregation => {
    // First filter out single `item` aggregations, which use top level name.
    if (aggregation.items.length === 1) {
      return requestedAggregations[aggregation.name];
    }

    // Next, filter the `items` array of aggregations with multiple sub-aggregations.
    aggregation.items = aggregation.items.filter(item => {
      return requestedAggregations[item.name];
    });

    // Finally, filter out any aggregations with no sub-aggregations remaining.
    return aggregation.items.length > 0;
  });

  // Find audits required for remaining aggregations.
  const requestedItems = _flatten(config.aggregations.map(aggregation => aggregation.items));
  const auditsArray = _flatten(requestedItems.map(item => Object.keys(item.audits)));
  const requestedAuditNames = new Set(auditsArray);

  // The `audits` property in the config is a list of paths of audits to run.
  // `requestedAuditNames` is a list of audit *names*. Map paths to names, then
  // filter out any paths of audits with names that weren't requested.
  const auditPathToName = new Map(Config.requireAudits(config.audits)
    .map((AuditClass, index) => {
      const auditPath = config.audits[index];
      const auditName = AuditClass.meta.name;
      return [auditPath, auditName];
    }));
  config.audits = config.audits.filter(auditPath => {
    const auditName = auditPathToName.get(auditPath);
    return requestedAuditNames.has(auditName);
  });
}

/**
 * @param {!Connection} connection
 * @param {string} url
 * @param {!Object} options Lighthouse options.
 * @param {!Object<boolean>} requestedAggregations Names of aggregations to include.
 * @return {!Promise}
 */
window.runLighthouseForConnection = function(connection, url, options, requestedAggregations) {
  // Always start with a freshly parsed default config.
  const runConfig = JSON.parse(JSON.stringify(defaultConfig));

  filterConfig(runConfig, requestedAggregations);
  const config = new Config(runConfig);

  // Add url and config to fresh options object.
  const runOptions = Object.assign({}, options, {url, config});

  // Run Lighthouse.
  return Runner.run(connection, runOptions);
};

/**
 * @param {!Object} options Lighthouse options.
 * @param {!Object<boolean>} requestedAggregations Names of aggregations to include.
 * @return {!Promise}
 */
window.runLighthouseInExtension = function(options, requestedAggregations) {
  // Default to 'info' logging level.
  log.setLevel('info');
  const connection = new ExtensionProtocol();
  return connection.getCurrentTabURL()
    .then(url => window.runLighthouseForConnection(connection, url, options, requestedAggregations))
    .then(results => {
      const blobURL = window.createReportPageAsBlob(results, 'extension');
      chrome.tabs.create({url: blobURL});
    });
};

/**
 * @param {!RawProtocol.Port} port
 * @param {string} url
 * @param {!Object} options Lighthouse options.
 * @param {!Object<boolean>} requestedAggregations Names of aggregations to include.
 * @return {!Promise}
 */
window.runLighthouseInWorker = function(port, url, options, requestedAggregations) {
  // Default to 'info' logging level.
  log.setLevel('info');
  const connection = new RawProtocol(port);
  return window.runLighthouseForConnection(connection, url, options, requestedAggregations);
};

/**
 * @param {!Object} results Lighthouse results object
 * @param {!string} reportContext Where the report is going
 * @return {!string} Blob URL of the report (or error page) HTML
 */
window.createReportPageAsBlob = function(results, reportContext) {
  performance.mark('report-start');

  const reportGenerator = new ReportGenerator();
  let html;
  try {
    html = reportGenerator.generateHTML(results, reportContext);
  } catch (err) {
    html = reportGenerator.renderException(err, results);
  }
  const blob = new Blob([html], {type: 'text/html'});
  const blobURL = window.URL.createObjectURL(blob);

  performance.mark('report-end');
  performance.measure('generate report', 'report-start', 'report-end');
  return blobURL;
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
          audits: aggregation.items[0].audits,
        };
      }

      return aggregation.items;
    })
  ).map(aggregation => {
    return {
      name: aggregation.name,
      audits: Object.keys(aggregation.audits)
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

if (window.chrome && chrome.runtime) {
  chrome.runtime.onInstalled.addListener(details => {
    if (details.previousVersion) {
      console.log('previousVersion', details.previousVersion);
    }
  });
}
