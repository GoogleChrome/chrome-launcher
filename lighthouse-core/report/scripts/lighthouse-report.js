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

class LighthouseReport {

  /**
   * @param {Object=} lhresults Lighthouse JSON results.
   */
  constructor(lhresults) {
    this.json = lhresults || null;
    this._addEventListeners();
  }

  _addEventListeners() {
    this._setupExpandDetailsWhenPrinting();

    const printButton = document.querySelector('.js-print');
    if (printButton) {
      printButton.addEventListener('click', _ => window.print());
    }

    const openButton = document.querySelector('.js-open');
    if (openButton) {
      openButton.addEventListener('click', this.sendJSONReport.bind(this));
    }

    const headerContainer = document.querySelector('.js-header-container');
    const toggleButton = headerContainer.querySelector('.js-header-toggle');
    toggleButton.addEventListener('click', () => headerContainer.classList.toggle('expanded'));
  }

  /**
   * Opens a new tab to the online viewer and sends the local page's JSON results
   * to the online viewer using postMessage.
   */
  sendJSONReport() {
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
        popup.postMessage({lhresults: this.json}, VIEWER_ORIGIN);
        window.removeEventListener('message', msgHandler);
      }
    }.bind(this));

    const popup = window.open(VIEWER_URL, '_blank');
  }

  /**
   * Sets up listeners to expand audit `<details>` when the user prints the page.
   * Ideally, a print stylesheet could take care of this, but CSS has no way to
   * open a `<details>` element. When the user closes the print dialog, all
   * `<details>` are collapsed.
   */
  _setupExpandDetailsWhenPrinting() {
    const details = Array.from(document.querySelectorAll('details'));

    // FF and IE implement these old events.
    if ('onbeforeprint' in window) {
      window.addEventListener('beforeprint', _ => {
        details.map(detail => detail.open = true);
      });
      window.addEventListener('afterprint', _ => {
        details.map(detail => detail.open = false);
      });
    } else {
      // Note: while FF has media listeners, it doesn't fire when matching 'print'.
      window.matchMedia('print').addListener(mql => {
        details.map(detail => detail.open = mql.matches);
      });
    }
  }
}

// If in Node, allow others to require us.  By default, browser code can juse
// use the LighthouseReport class.
if (typeof module !== 'undefined') {
  module.exports = LighthouseReport;
}
