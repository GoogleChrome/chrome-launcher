/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');

class ViolationAudit extends Audit {
  /**
   * @param {!Artifacts} artifacts
   * @param {!RegExp} pattern
   * @return {!Array}
   */
  static getViolationResults(artifacts, pattern) {
    return artifacts.ChromeConsoleMessages
        .map(message => message.entry)
        .filter(entry => entry.url && entry.source === 'violation' && pattern.test(entry.text))
        .map(entry => Object.assign({label: `line: ${entry.lineNumber}`}, entry));
  }
}

module.exports = ViolationAudit;
