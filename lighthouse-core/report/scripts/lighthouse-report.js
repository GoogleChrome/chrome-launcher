/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/* global ga, logger */

'use strict';

class LighthouseReport {

  /**
   * @param {Object=} lhresults Lighthouse JSON results.
   */
  constructor(lhresults) {
    this.json = lhresults || null;
    this._copyAttempt = false;

    this.onCopy = this.onCopy.bind(this);
    this.onExportButtonClick = this.onExportButtonClick.bind(this);
    this.onExport = this.onExport.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.printShortCutDetect = this.printShortCutDetect.bind(this);

    this._addEventListeners();
  }

  _addEventListeners() {
    this._setUpCollaspeDetailsAfterPrinting();

    const headerContainer = document.querySelector('.js-header-container');
    if (headerContainer) {
      const toggleButton = headerContainer.querySelector('.js-header-toggle');
      toggleButton.addEventListener('click', () => headerContainer.classList.toggle('expanded'));
    }

    this.exportButton = document.querySelector('.js-export');
    if (this.exportButton) {
      this.exportButton.addEventListener('click', this.onExportButtonClick);
      const dropdown = document.querySelector('.export-dropdown');
      dropdown.addEventListener('click', this.onExport);

      document.addEventListener('copy', this.onCopy);
    }
    document.addEventListener('keydown', this.printShortCutDetect);
  }

  /**
   * Handler copy events.
   */
  onCopy(e) {
    // Only handle copy button presses (e.g. ignore the user copying page text).
    if (this._copyAttempt) {
      // We want to write our own data to the clipboard, not the user's text selection.
      e.preventDefault();
      e.clipboardData.setData('text/plain', JSON.stringify(this.json, null, 2));
      logger.log('Report JSON copied to clipboard');
    }

    this._copyAttempt = false;
  }

  /**
   * Copies the report JSON to the clipboard (if supported by the browser).
   */
  onCopyButtonClick() {
    if (window.ga) {
      ga('send', 'event', 'report', 'copy');
    }

    try {
      if (document.queryCommandSupported('copy')) {
        this._copyAttempt = true;

        // Note: In Safari 10.0.1, execCommand('copy') returns true if there's
        // a valid text selection on the page. See http://caniuse.com/#feat=clipboard.
        const successful = document.execCommand('copy');
        if (!successful) {
          this._copyAttempt = false; // Prevent event handler from seeing this as a copy attempt.
          logger.warn('Your browser does not support copy to clipboard.');
        }
      }
    } catch (err) {
      this._copyAttempt = false;
      logger.log(err.message);
    }
  }

  closeExportDropdown() {
    this.exportButton.classList.remove('active');
  }

  /**
   * Click handler for export button.
   */
  onExportButtonClick(e) {
    e.preventDefault();
    e.target.classList.toggle('active');
    document.addEventListener('keydown', this.onKeyDown);
  }

  /**
   * Handler for "export as" button.
   */
  onExport(e) {
    e.preventDefault();

    if (!e.target.dataset.action) {
      return;
    }

    switch (e.target.dataset.action) {
      case 'copy':
        this.onCopyButtonClick();
        break;
      case 'open-viewer':
        this.sendJSONReport();
        break;
      case 'print':
        this.expandDetailsWhenPrinting();
        window.print();
        break;
      case 'save-json': {
        const jsonStr = JSON.stringify(this.json, null, 2);
        this._saveFile(new Blob([jsonStr], {type: 'application/json'}));
        break;
      }
      case 'save-html': {
        let htmlStr = '';

        // Since Viewer generates its page HTML dynamically from report JSON,
        // run the ReportGenerator. For everything else, the page's HTML is
        // already the final product.
        if (e.target.dataset.context !== 'viewer') {
          htmlStr = document.documentElement.outerHTML;
        } else {
          const reportGenerator = new ReportGenerator();
          htmlStr = reportGenerator.generateHTML(this.json, 'cli');
        }

        try {
          this._saveFile(new Blob([htmlStr], {type: 'text/html'}));
        } catch (err) {
          logger.error('Could not export as HTML. ' + err.message);
        }
        break;
      }
    }

    this.closeExportDropdown();
    document.removeEventListener('keydown', this.onKeyDown);
  }

  /**
   * Keydown handler for the document.
   */
  onKeyDown(e) {
    if (e.keyCode === 27) { // ESC
      this.closeExportDropdown();
    }
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
   * Expands details while user using short cut to print report
   */
  printShortCutDetect(e) {
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 80) { // Ctrl+P
      this.expandDetailsWhenPrinting();
    }
  }

  /**
   * Expands audit `<details>` when the user prints the page.
   * Ideally, a print stylesheet could take care of this, but CSS has no way to
   * open a `<details>` element.
   */
  expandDetailsWhenPrinting() {
    const details = Array.from(document.querySelectorAll('details'));
    details.map(detail => detail.open = true);
  }

  /**
   * Sets up listeners to collapse audit `<details>` when the user closes the
   * print dialog, all `<details>` are collapsed.
   */
  _setUpCollaspeDetailsAfterPrinting() {
    const details = Array.from(document.querySelectorAll('details'));

    // FF and IE implement these old events.
    if ('onbeforeprint' in window) {
      window.addEventListener('afterprint', _ => {
        details.map(detail => detail.open = false);
      });
    } else {
      // Note: while FF has media listeners, it doesn't fire when matching 'print'.
      window.matchMedia('print').addListener(mql => {
        if (!mql.matches) {
          details.map(detail => detail.open = mql.matches);
        }
      });
    }
  }
  /**
   * Downloads a file (blob) using a[download].
   * @param {Blob|File} blob The file to save.
   */
  _saveFile(blob) {
    const filename = window.getFilenamePrefix({
      url: this.json.url,
      generatedTime: this.json.generatedTime
    });

    const ext = blob.type.match('json') ? '.json' : '.html';

    const a = document.createElement('a');
    a.download = `${filename}${ext}`;
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a); // Firefox requires anchor to be in the DOM.
    a.click();

    // cleanup.
    document.body.removeChild(a);
    setTimeout(_ => URL.revokeObjectURL(a.href), 500);
  }
}

// Exports for Node usage (Viewer browserifies).
let ReportGenerator;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LighthouseReport;
  ReportGenerator = require('../../../lighthouse-core/report/report-generator');
  window.getFilenamePrefix = require('../../../lighthouse-core/lib/file-namer').getFilenamePrefix;
}
