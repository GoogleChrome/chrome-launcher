/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures elements with an ARIA role are contained by their required parents.
 * e.g. A child node with role="listitem" should be contained by a parent with role="list".
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class AriaRequiredParent extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'aria-required-parent',
      description: '`[role]`s are contained by their required parent element.',
      helpText: 'Some ARIA child roles must be contained by specific parent roles to ' +
          'properly perform their intended accessibility functions. ' +
          '[Learn more](https://dequeuniversity.com/rules/worldspace/2.1/aria-required-parent).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = AriaRequiredParent;
