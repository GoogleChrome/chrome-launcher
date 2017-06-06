/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures `<input type="image">` elements have alternate text.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class InputImageAlt extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'input-image-alt',
      description: '`<input type="image">` elements have `[alt]` text.',
      helpText: 'When an image is being used as an `<input>` button, providing alternative text ' +
          'can help screen reader users understand the purpose of the button. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/1.1/input-image-alt).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = InputImageAlt;
