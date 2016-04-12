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
  const resultsEl = document.body.querySelector('.results');
  const reloadPage = document.body.querySelector('.reload-all');

  background.runAudits({
    flags: {
      mobile: false,
      loadPage: false
    }
  }).then(ret => {
    resultsEl.innerHTML = ret;
  });

  reloadPage.addEventListener('click', () => {
    background.runAudits({
      flags: {
        mobile: true,
        loadPage: true
      }
    }).then(ret => {
      resultsEl.innerHTML = ret;
    });
  });

  chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
    if (tabs.length === 0) {
      return;
    }

    const siteURL = new URL(tabs[0].url);
    siteNameEl.textContent = siteURL.origin;
  });

  document.addEventListener('click', evt => {
    const targetClassName = evt.target.parentNode.classList;

    if (!targetClassName.contains('group')) {
      return;
    }

    targetClassName.toggle('expanded');
  });
});
