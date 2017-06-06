/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures every form element has a label.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class Label extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'label',
      description: 'Form elements have associated labels.',
      helpText: 'Labels ensure that form controls are announced properly by assistive ' +
          'technologies, like screen readers. [Learn ' +
          'more](https://developers.google.com/web/tools/lighthouse/audits/form-labels).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = Label;
