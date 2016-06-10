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

const ExtensionProtocol = require('../../../src/lib/drivers/extension.js');
const lighthouse = require('../../../src/lighthouse');
const config = require('../../../config/default.json');

const NO_SCORE_PROVIDED = '-1';

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

window.runAudits = function(options) {
  const driver = new ExtensionProtocol();

  return driver.getCurrentTabURL()
      .then(url => {
        // Add in the URL to the options.
        return lighthouse(driver, Object.assign({}, options, {url, config}));
      });
};

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/>/g, '&gt;')
    .replace(/</g, '&lt;')
    .replace(/`/g, '&#96;');
}

window.createResultsHTML = function(results) {
  let resultsHTML = '';

  results.aggregations.forEach(item => {
    const score = (item.score.overall * 100).toFixed(0);
    const groupHasErrors = (score < 100);
    const groupClass = 'group ' +
        (groupHasErrors ? 'errors expanded' : 'no-errors collapsed');

    // Skip any tests that didn't run.
    if (score === NO_SCORE_PROVIDED) {
      return;
    }

    let groupHTML = '';
    item.score.subItems.forEach(subitem => {
      const debugString = subitem.debugString ? ` title="${escapeHTML(subitem.debugString)}"` : '';

      const status = subitem.value ?
          `<span class="pass" ${debugString}>Pass</span>` :
          `<span class="fail" ${debugString}>Fail</span>`;
      const rawValue = subitem.rawValue ? `(${escapeHTML(subitem.rawValue)})` : '';
      groupHTML += `<li>${escapeHTML(subitem.description)}: ${status} ${rawValue}</li>`;
    });

    resultsHTML +=
      `<li class="${groupClass}">
        <span class="group-name">${escapeHTML(item.name)}</span>
        <span class="group-score">(${score}%)</span>
        <ul>
          ${groupHTML}
        </ul>
      </li>`;
  });

  return resultsHTML;
};

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});
