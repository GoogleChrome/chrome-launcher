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

const _flatten = arr => [].concat.apply([], arr);

document.addEventListener('DOMContentLoaded', _ => {
  const background = chrome.extension.getBackgroundPage();
  const defaultAggregations = background.getDefaultAggregations();

  const siteNameEl = window.document.querySelector('header h2');
  const generateReportEl = document.getElementById('generate-report');
  const subpageVisibleClass = 'subpage--visible';

  const statusEl = document.body.querySelector('.status');
  const statusMessageEl = document.body.querySelector('.status__msg');
  const statusDetailsMessageEl = document.body.querySelector('.status__detailsmsg');
  const spinnerEl = document.body.querySelector('.status__spinner');
  const feedbackEl = document.body.querySelector('.feedback');

  const generateOptionsEl = document.getElementById('configure-options');
  const optionsEl = document.body.querySelector('.options');
  const optionsList = document.body.querySelector('.options__list');
  const okButton = document.getElementById('ok');

  let spinnerAnimation;

  function startSpinner() {
    statusEl.classList.add(subpageVisibleClass);
    spinnerAnimation = spinnerEl.animate([
      {transform: 'rotate(0deg)'},
      {transform: 'rotate(359deg)'}
    ], {
      duration: 1000,
      iterations: Infinity
    });
  }

  function stopSpinner() {
    spinnerAnimation.cancel();
    statusEl.classList.remove(subpageVisibleClass);
  }

  function logstatus([, message, details]) {
    statusMessageEl.textContent = message;
    statusDetailsMessageEl.textContent = details;
  }

  function createOptionItem(text, isChecked) {
    const input = document.createElement('input');
    input.setAttribute('type', 'checkbox');
    input.setAttribute('value', text);
    if (isChecked) {
      input.setAttribute('checked', 'checked');
    }

    const label = document.createElement('label');
    label.appendChild(input);
    label.appendChild(document.createTextNode(text));
    const listItem = document.createElement('li');
    listItem.appendChild(label);

    return listItem;
  }

  /**
   * Generates a document fragment containing a list of checkboxes and labels
   * for the aggregation categories.
   * @param {!Object<boolean>} selectedAggregations
   * @return {!DocumentFragment}
   */
  function generateOptionsList(list, selectedAggregations) {
    const frag = document.createDocumentFragment();

    defaultAggregations.forEach(aggregation => {
      const isChecked = selectedAggregations[aggregation.name];
      frag.appendChild(createOptionItem(aggregation.name, isChecked));
    });

    return frag;
  }

  /**
   * Returns an array of names of audits from the selected aggregation
   * categories.
   * @param {!Object<boolean>} selectedAggregations
   * @return {!Array<string>}
   */
  function getAuditsFromSelected(selectedAggregations) {
    const auditLists = defaultAggregations.filter(aggregation => {
      return selectedAggregations[aggregation.name];
    }).map(selectedAggregation => {
      return selectedAggregation.audits;
    });

    return _flatten(auditLists);
  }

  background.listenForStatus(logstatus);
  background.loadSelectedAggregations().then(aggregations => {
    const frag = generateOptionsList(optionsList, aggregations);
    optionsList.appendChild(frag);
  });

  generateReportEl.addEventListener('click', () => {
    startSpinner();
    feedbackEl.textContent = '';

    background.loadSelectedAggregations()
    .then(getAuditsFromSelected)
    .then(selectedAudits => {
      return background.runLighthouseInExtension({
        flags: {
          disableCpuThrottling: true
        },
        restoreCleanState: true
      }, selectedAudits);
    })
    .catch(err => {
      let {message} = err;
      if (err.message.toLowerCase().startsWith('another debugger')) {
        message = 'You probably have DevTools open.' +
          ' Close DevTools to use lighthouse';
      }
      feedbackEl.textContent = message;
      stopSpinner();
      background.console.error(err);
    });
  });

  generateOptionsEl.addEventListener('click', () => {
    optionsEl.classList.add(subpageVisibleClass);
  });

  okButton.addEventListener('click', () => {
    // Save selected aggregation categories on options page close.
    const checkedAggregations = Array.from(optionsEl.querySelectorAll(':checked'))
        .map(input => input.value);
    background.saveSelectedAggregations(checkedAggregations);

    optionsEl.classList.remove(subpageVisibleClass);
  });

  chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
    if (tabs.length === 0) {
      return;
    }

    const siteURL = new URL(tabs[0].url);
    siteNameEl.textContent = siteURL.origin;
  });
});
