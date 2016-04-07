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

const ExtensionProtocol = require('../../../helpers/extension/driver.js');
const Auditor = require('../../../auditor');
const Gatherer = require('../../../gatherer');
const Aggregator = require('../../../aggregator');

const driver = new ExtensionProtocol();
const gatherers = [
  require('../../../gatherers/url'),
  require('../../../gatherers/https'),
  require('../../../gatherers/service-worker'),
  require('../../../gatherers/viewport'),
  require('../../../gatherers/theme-color'),
  require('../../../gatherers/html'),
  require('../../../gatherers/manifest')
];
const audits = [
  require('../../../audits/security/is-on-https'),
  require('../../../audits/offline/service-worker'),
  require('../../../audits/mobile-friendly/viewport'),
  require('../../../audits/manifest/exists'),
  require('../../../audits/manifest/background-color'),
  require('../../../audits/manifest/theme-color'),
  require('../../../audits/manifest/icons-min-192'),
  require('../../../audits/manifest/icons-min-144'),
  require('../../../audits/manifest/name'),
  require('../../../audits/manifest/short-name'),
  require('../../../audits/manifest/start-url'),
  require('../../../audits/html/meta-theme-color')
];
const aggregators = [
  require('../../../aggregators/will-get-add-to-homescreen-prompt'),
  require('../../../aggregators/launches-with-splash-screen'),
  require('../../../aggregators/omnibox-is-themed'),
  require('../../../aggregators/can-load-offline'),
  require('../../../aggregators/is-secure'),
  require('../../../aggregators/is-sized-for-mobile-screen')
];

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/>/g, '&gt;')
    .replace(/</g, '&lt;')
    .replace(/`/g, '&#96;');
}

function createResultsHTML(results) {
  let resultsHTML = '';

  results.forEach(item => {
    const score = (item.score.overall * 100).toFixed(0);
    const groupHasErrors = (score < 100);
    const groupClass = 'group ' +
        (groupHasErrors ? 'errors expanded' : 'no-errors collapsed');

    let groupHTML = '';
    item.score.subItems.forEach(subitem => {
      const debugString = subitem.debugString ? ` title="${escapeHTML(subitem.debugString)}"` : '';

      // TODO: make this work with numeric values.
      const status = subitem.value ?
          `<span class="pass" ${debugString}>Pass</span>` :
          `<span class="fail" ${debugString}>Fail</span>`;
      groupHTML += `<li>${escapeHTML(subitem.description)}: ${status}</li>`;
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
}

export function runPwaAudits() {
  return Gatherer
    .gather(gatherers, {driver})
    .then(artifacts => Auditor.audit(artifacts, audits))
    .then(results => Aggregator.aggregate(aggregators, results))
    .then(results => {
      return createResultsHTML(results);
    })
    .catch(err => `<div class="error">Unable to audit page: ${escapeHTML(err.message)}</div>`);
}
