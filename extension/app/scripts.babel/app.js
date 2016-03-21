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

import {runPwaAudits} from './pwa-check.js';

document.addEventListener('DOMContentLoaded', _ => {
  const siteNameEl = window.document.querySelector('header h2');
  const resultsEl = document.body.querySelector('.results');

  chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
    if (tabs.length === 0) {
      return;
    }

    const siteURL = new URL(tabs[0].url);
    siteNameEl.textContent = siteURL.origin;
  });

  runPwaAudits(chrome).then(ret => {
    resultsEl.innerHTML = ret;
  }, err => {
    resultsEl.innerHTML = `<div class="error">Unable to audit page: ${err.message}</div>`;
  });
});

document.addEventListener('click', evt => {
  const targetClassName = evt.target.parentNode.classList;

  if (!targetClassName.contains('group')) {
    return;
  }

  if (targetClassName.contains('expanded')) {
    targetClassName.remove('expanded');
    targetClassName.add('collapsed');
  } else {
    targetClassName.add('expanded');
    targetClassName.remove('collapsed');
  }
});
