/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures each page has at least one mechanism for a user to bypass navigation
 * and jump straight to the content.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class Bypass extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'bypass',
      description: 'The page contains a heading, skip link, or landmark region.',
      helpText: 'Adding ways to bypass repetitive content lets keyboard users navigate the page ' +
          'more efficiently. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/1.1/bypass).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = Bypass;
