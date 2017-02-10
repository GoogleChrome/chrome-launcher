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

/**
 * Error strings that indicate a problem in how Lighthouse was run, not in
 * Lighthouse itself, mapped to more useful strings to report to the user.
 */
const NON_BUG_ERROR_MESSAGES = {
  'Another debugger': 'You probably have DevTools open. Close DevTools to use Lighthouse',
  'multiple tabs': 'You probably have multiple tabs open to the same origin. ' +
      'Close the other tabs to use Lighthouse.',
  // The extension debugger API is forbidden from attaching to the web store.
  // @see https://chromium.googlesource.com/chromium/src/+/5d1f214db0f7996f3c17cd87093d439ce4c7f8f1/chrome/common/extensions/chrome_extensions_client.cc#232
  'The extensions gallery cannot be scripted': 'The Lighthouse extension cannot audit the ' +
      'Chrome Web Store. If necessary, use the Lighthouse CLI to do so.',
  // The user tries to review an error page or has network issues
  'Unable to load the page': 'Unable to load the page. Please verify the url you ' +
      'are trying to review.'
};

const MAX_ISSUE_ERROR_LENGTH = 60;

const subpageVisibleClass = 'subpage--visible';

const getBackgroundPage = new Promise((resolve, reject) => {
  chrome.runtime.getBackgroundPage(resolve);
});

let siteURL = null;

function getLighthouseVersion() {
  return chrome.runtime.getManifest().version;
}

function getChromeVersion() {
  return /Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1];
}

function showRunningSubpage() {
  document.querySelector('.status').classList.add(subpageVisibleClass);
}

function hideRunningSubpage() {
  document.querySelector('.status').classList.remove(subpageVisibleClass);
}

function buildReportErrorLink(err) {
  let qsBody = '**Lighthouse Version**: ' + getLighthouseVersion() + '\n';
  qsBody += '**Chrome Version**: ' + getChromeVersion() + '\n';

  if (siteURL) {
    qsBody += '**URL**: ' + siteURL + '\n';
  }

  qsBody += '**Error Message**: ' + err.message + '\n';
  qsBody += '**Stack Trace**:\n ```' + err.stack + '```';

  const base = 'https://github.com/GoogleChrome/lighthouse/issues/new?';
  let titleError = err.message;

  if (titleError.length > MAX_ISSUE_ERROR_LENGTH) {
    titleError = `${titleError.substring(0, MAX_ISSUE_ERROR_LENGTH - 3)}...`;
  }
  const title = encodeURI('title=Extension Error: ' + titleError);
  const body = '&body=' + encodeURI(qsBody);

  const reportErrorEl = document.createElement('a');
  reportErrorEl.className = 'button button--report-error';
  reportErrorEl.href = base + title + body;
  reportErrorEl.textContent = 'Report Error';
  reportErrorEl.target = '_blank';

  return reportErrorEl;
}

function logStatus([, message, details]) {
  document.querySelector('.status__msg').textContent = message;
  const statusDetailsMessageEl = document.querySelector('.status__detailsmsg');
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
 * Click event handler for Generate Report button.
 * @param {!Window} background Reference to the extension's background page.
 * @param {!Object<boolean>} selectedAggregations
 */
function onGenerateReportButtonClick(background, selectedAggregations) {
  showRunningSubpage();

  const feedbackEl = document.querySelector('.feedback');
  feedbackEl.textContent = '';

  background.runLighthouseInExtension({
    flags: {
      disableCpuThrottling: true
    },
    restoreCleanState: true
  }, selectedAggregations).catch(err => {
    let message = err.message;
    let includeReportLink = true;

    // Check for errors in how the user ran Lighthouse and replace with a more
    // helpful message (and remove 'Report Error' link).
    for (const [test, replacement] of Object.entries(NON_BUG_ERROR_MESSAGES)) {
      if (message.includes(test)) {
        message = replacement;
        includeReportLink = false;
        break;
      }
    }

    feedbackEl.textContent = message;

    if (includeReportLink) {
      feedbackEl.className = 'feedback-error';
      feedbackEl.appendChild(buildReportErrorLink(err));
    }

    hideRunningSubpage();
    background.console.error(err);
  });
}

/**
 * Generates a document fragment containing a list of checkboxes and labels
 * for the aggregation categories.
 * @param {!Window} background Reference to the extension's background page.
 * @param {!Object<boolean>} selectedAggregations
 */
function generateOptionsList(background, selectedAggregations) {
  const frag = document.createDocumentFragment();

  background.getDefaultAggregations().forEach(aggregation => {
    const isChecked = selectedAggregations[aggregation.name];
    frag.appendChild(createOptionItem(aggregation.name, isChecked));
  });

  const optionsList = document.querySelector('.options__list');
  optionsList.appendChild(frag);
}

/**
 * Initializes the popup's state and UI elements.
 * @param {!Window} background Reference to the extension's background page.
 */
function initPopup() {
  getBackgroundPage.then(background => {
    // To prevent visual hiccups when opening the popup, we default the subpage
    // to the "running" view and switch to the default view once we're sure
    // Lighthouse is not already auditing the page. This change was necessary
    // now that fetching the background event page is async.
    if (background.isRunning()) {
      showRunningSubpage();
    } else {
      hideRunningSubpage();
    }

    background.listenForStatus(logStatus);

    background.loadSettings().then(settings => {
      generateOptionsList(background, settings.selectedAggregations);

      document.querySelector('.setting-disable-extensions').checked = settings.disableExtensions;

      const generateReportButton = document.getElementById('generate-report');
      generateReportButton.addEventListener('click', () => {
        onGenerateReportButtonClick(background, settings.selectedAggregations);
      });
    });

    const generateOptionsEl = document.getElementById('configure-options');
    const optionsEl = document.querySelector('.options');
    generateOptionsEl.addEventListener('click', () => {
      optionsEl.classList.add(subpageVisibleClass);
    });

    const okButton = document.getElementById('ok');
    okButton.addEventListener('click', () => {
      // Save settings when options page is closed.
      const selectedAggregations = Array.from(optionsEl.querySelectorAll(':checked'))
          .map(input => input.value);
      const disableExtensions = document.querySelector('.setting-disable-extensions').checked;

      background.saveSettings({selectedAggregations, disableExtensions});

      optionsEl.classList.remove(subpageVisibleClass);
    });
  });

  chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
    if (tabs.length === 0) {
      return;
    }

    siteURL = new URL(tabs[0].url);

    // Show the user what URL is going to be tested.
    document.querySelector('header h2').textContent = siteURL.origin;
  });
}

initPopup();
