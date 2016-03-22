/**
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

const driver = new ExtensionProtocol();
const gatherers = [
  require('../../../gatherers/url'),
  require('../../../gatherers/https'),
  require('../../../gatherers/service-worker'),
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
  require('../../../audits/manifest/icons'),
  require('../../../audits/manifest/icons-192'),
  require('../../../audits/manifest/name'),
  require('../../../audits/manifest/short-name'),
  require('../../../audits/manifest/start-url')
];

function createResultsHTML(results) {
  const resultsGroup = {};
  let groupName = null;

  // Go through each group and restructure the results accordingly.
  results.forEach(result => {
    groupName = result.tags;
    if (!resultsGroup[groupName]) {
      resultsGroup[groupName] = [];
    }

    resultsGroup[groupName].push({
      title: result.description,
      value: result.value
    });
  });

  const groups = Object.keys(resultsGroup);
  let resultsHTML = '';

  groups.forEach(group => {
    let groupHasErrors = false;

    const groupHTML = resultsGroup[group].reduce((prev, result) => {
      const status = result.value ?
          '<span class="pass">Pass</span>' : '<span class="fail">Fail</span>';
      groupHasErrors = groupHasErrors || (!result.value);
      return prev + `<li>${result.title}: ${status}</li>`;
    }, '');

    const groupClass = 'group ' +
        (groupHasErrors ? 'errors expanded' : 'no-errors collapsed');

    resultsHTML +=
      `<li class="${groupClass}">
        <span class="group-name">${group}</span>
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
    .then(results => {
      return createResultsHTML(results);
    });
}
