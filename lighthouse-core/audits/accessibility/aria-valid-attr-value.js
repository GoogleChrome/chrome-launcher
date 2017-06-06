/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures all ARIA attributes have valid values.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class ARIAValidAttr extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'aria-valid-attr-value',
      description: '`[aria-*]` attributes have valid values.',
      helpText: 'Assistive technologies, like screen readers, can\'t interpret ARIA ' +
          'attributes with invalid values. [Learn ' +
          'more](https://developers.google.com/web/tools/lighthouse/audits/valid-aria-values).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = ARIAValidAttr;
