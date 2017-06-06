/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures every id attribute value is unique.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class DuplicateId extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'duplicate-id',
      description: '`[id]` attributes on the page are unique.',
      helpText: 'The value of an id attribute must be unique to prevent ' +
          'other instances from being overlooked by assistive technologies. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/1.1/duplicate-id).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = DuplicateId;
