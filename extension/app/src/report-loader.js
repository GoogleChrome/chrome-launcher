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
const ReportGenerator = require('../../../report/report-generator.js');

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
    const reportGenerator = new ReportGenerator();
    const html = reportGenerator.generateHTML(results);

    this.stopSpinner();
    document.documentElement.innerHTML = html;

    // Find and replace all the scripts that have been injected so that they get evaluated.
    const scripts = document.querySelectorAll('script');
    scripts.forEach(this.replaceScript);
  }

  /**
   * Replaces the script injected by innerHTML so that it actually gets evaluated and executed.
   */
  replaceScript(script) {
    const newScript = document.createElement('script');
    newScript.src = script.src;
    document.body.appendChild(newScript);
  }
}

const reportLoader = new ReportLoader();

if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
  chrome.runtime.sendMessage({ready: true}, response => {
    reportLoader.write(response);
  });
}
