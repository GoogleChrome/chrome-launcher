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
const Report = require('../../../report/report.js');

class ReportLoader {
  constructor() {
    this.spinnerEl = document.querySelector('.js-spinner');
    this.startSpinner();
  }

  startSpinner() {
    this.spinnerEl.classList.remove('spinner--hidden');
    this.spinnerAnimation = this.spinnerEl.animate([
      {transform: 'rotate(0deg)'},
      {transform: 'rotate(359deg)'}
    ], {
      duration: 1000,
      iterations: Infinity
    });
  }

  stopSpinner() {
    this.spinnerAnimation.cancel();
    this.spinnerEl.classList.add('spinner--hidden');
  }

  write(results) {
    const report = new Report();
    report.generateHTML(results).then(html => {
      this.stopSpinner();
      document.documentElement.innerHTML = html;
    });
  }
}

const report = new ReportLoader();

if (chrome && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener(data => {
    report.write(data);
  });
}
