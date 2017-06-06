/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures links have discernible text.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class LinkName extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'link-name',
      description: 'Links have a discernable name.',
      helpText: 'Link text (and alternate text for images, when used as links) that is ' +
          'discernible, unique, and focusable improves the navigation experience for ' +
          'screen reader users. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/1.1/link-name).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = LinkName;
