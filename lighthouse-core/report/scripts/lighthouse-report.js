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

/* global window, document */

'use strict';

/**
 * Opens a new tab to the online viewer and sends the local page's JSON results
 * to the online viewer using postMessage.
 */
function sendJSONReport() {
  const VIEWER_ORIGIN = 'https://googlechrome.github.io';
  const VIEWER_URL = `${VIEWER_ORIGIN}/lighthouse/viewer/`;

  // Chrome doesn't allow us to immediately postMessage to a popup right
  // after it's created. Normally, we could also listen for the popup window's
  // load event, however it is cross-domain and won't fire. Instead, listen
  // for a message from the target app saying "I'm open".
  window.addEventListener('message', function msgHandler(e) {
    if (e.origin !== VIEWER_ORIGIN) {
      return;
    }

    if (e.data.opened) {
      popup.postMessage({lhresults: window.lhresults}, VIEWER_ORIGIN);
      window.removeEventListener('message', msgHandler);
    }
  });

  const popup = window.open(VIEWER_URL, '_blank');
}

window.addEventListener('DOMContentLoaded', _ => {
  const printButton = document.querySelector('.js-print');
  printButton.addEventListener('click', _ => {
    window.print();
  });

  const openButton = document.querySelector('.js-open');
  openButton.addEventListener('click', sendJSONReport);
});
