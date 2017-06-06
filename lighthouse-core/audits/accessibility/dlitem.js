/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures that all child <dd> and <dt> elements have a <dl> as a parent.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class DLItem extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'dlitem',
      description: 'Definition list items are wrapped in `<dl>` elements.',
      helpText: 'Definition list items (`<dt>` and `<dd>`) must be wrapped in a ' +
          'parent `<dl>` element to ensure that screen readers can properly announce them. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/1.1/dlitem).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = DLItem;
