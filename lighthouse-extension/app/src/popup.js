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

document.addEventListener('DOMContentLoaded', _ => {
  const background = chrome.extension.getBackgroundPage();
  const siteNameEl = window.document.querySelector('header h2');
  const generateReportEl = document.body.querySelector('.generate-report');

  const statusEl = document.body.querySelector('.status');
  const statusMessageEl = document.body.querySelector('.status__msg');
  const statusDetailsMessageEl = document.body.querySelector('.status__detailsmsg');
  const spinnerEl = document.body.querySelector('.status__spinner');
  const feedbackEl = document.body.querySelector('.feedback');
  let spinnerAnimation;

  const startSpinner = _ => {
    statusEl.classList.add('status--visible');
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
    statusEl.classList.remove('status--visible');
  };

  const logstatus = ([, message, details]) => {
    statusMessageEl.textContent = message;
    statusDetailsMessageEl.textContent = details;
  };

  background.listenForStatus(logstatus);

  generateReportEl.addEventListener('click', () => {
    startSpinner();
    feedbackEl.textContent = '';
    background.runAudits({
      flags: {
        mobile: true,
        loadPage: true
      }
    })
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

  chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
    if (tabs.length === 0) {
      return;
    }

    const siteURL = new URL(tabs[0].url);
    siteNameEl.textContent = siteURL.origin;
  });
});
