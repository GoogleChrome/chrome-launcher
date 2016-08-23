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

const _flatten = arr => [].concat.apply([], arr);

document.addEventListener('DOMContentLoaded', _ => {
  const background = chrome.extension.getBackgroundPage();
  const aggregations = background.getListOfAudits();

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

  const createOptionItem = (text, isChecked) => {
    const input = document.createElement('input');
    const attributes = [['type', 'checkbox'], ['value', text]];
    if (isChecked) {
      attributes.push(['checked', 'checked']);
    }

    attributes.forEach(attr => input.setAttribute.apply(input, attr));

    const label = document.createElement('label');
    label.appendChild(input);
    label.appendChild(document.createTextNode(text));
    const listItem = document.createElement('li');
    listItem.appendChild(label);

    return listItem;
  };

  const generateOptionsList = (list, selectedAudits) => {
    const frag = document.createDocumentFragment();

    aggregations.forEach(aggregation => {
      frag.appendChild(createOptionItem(aggregation.name, selectedAudits[aggregation.name]));
    });

    list.appendChild(frag);
  };

  const getAuditsFromCategory = audits => _flatten(
    Object.keys(audits).filter(audit => audits[audit]).map(audit => {
      const auditsInCategory = aggregations.find(aggregation => aggregation.name === audit).criteria;

      return Object.keys(auditsInCategory);
    })
  );

  background.listenForStatus(logstatus);
  background.fetchAudits().then(audits => {
    generateOptionsList(optionsList, audits);
  });

  generateReportEl.addEventListener('click', () => {
    startSpinner();
    feedbackEl.textContent = '';

    background.fetchAudits()
    .then(getAuditsFromCategory)
    .then(audits => background.runAudits({
      flags: {
        mobile: true,
        loadPage: true
      }
    }, audits))
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

  okButton.addEventListener('click', () => {
    const checkedAudits = Array.from(optionsEl.querySelectorAll(':checked'))
        .map(input => input.value);
    background.saveAudits(checkedAudits);

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
