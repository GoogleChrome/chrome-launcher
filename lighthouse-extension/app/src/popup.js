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

const configJSON = require('../../../lighthouse-core/config/default.json');
const _flatten = arr => [].concat.apply([], arr);
const aggregations = _flatten([
  configJSON.aggregations[0].items,
  configJSON.aggregations[1],
  configJSON.aggregations[2]
]);

document.addEventListener('DOMContentLoaded', _ => {
  const background = chrome.extension.getBackgroundPage();
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
  const goBack = document.getElementById('go-back');

  let spinnerAnimation;

  const startSpinner = _ => {
    statusEl.classList.add(subpageVisibleClass);
    spinnerAnimation = spinnerEl.animate([
      {transform: 'rotate(0deg)'},
      {transform: 'rotate(359deg)'}
    ], {
      duration: 1000,
      iterations: Infinity
    });
  };

  const stopSpinner = _ => {
    spinnerAnimation.cancel();
    statusEl.classList.remove(subpageVisibleClass);
  };

  const logstatus = ([, message, details]) => {
    statusMessageEl.textContent = message;
    statusDetailsMessageEl.textContent = details;
  };

  const getAuditsOfName = name => {
    let aggregation = aggregations.filter(aggregation => aggregation.name === name);

    if (!aggregation.length) {
      return [];
    }

    // This checks if we have a a criteria property, it's necessary to check categories like Best Practices
    if (!aggregation[0].hasOwnProperty('criteria')) {
      aggregation = aggregation[0].items;
    }

    return Object.keys(aggregation[0].criteria);
  };

  background.listenForStatus(logstatus);

  generateReportEl.addEventListener('click', () => {
    startSpinner();
    feedbackEl.textContent = '';

    const audits = _flatten(
      Array.from(optionsEl.querySelectorAll(':checked'))
        .map(input => getAuditsOfName(input.value))
    );

    background.runAudits({
      flags: {
        mobile: true,
        loadPage: true
      }
    }, audits)
    .then(results => {
      background.createPageAndPopulate(results);
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

  goBack.addEventListener('click', () => {
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
