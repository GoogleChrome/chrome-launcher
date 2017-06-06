/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures tabindex attribute values are not greater than 0.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class TabIndex extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'tabindex',
      description: 'No element has a `[tabindex]` value greater than 0.',
      helpText: 'A value greater than 0 implies an explicit navigation ordering. ' +
          'Although technically valid, this often creates frustrating experiences ' +
          'for users who rely on assistive technologies. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/tabindex).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = TabIndex;
