/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensure that each table header in a data table refers to data cells.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class THHasDataCells extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'th-has-data-cells',
      description: '`<th>` elements and elements with `[role="columnheader"/"rowheader"]` have ' +
          'data cells they describe.',
      helpText: 'Screen readers have features to make navigating tables easier. Ensuring table ' +
          'headers always refer to some set of cells may improve the experience for screen ' +
          'reader users. ' +
          '[Learn more](https://dequeuniversity.com/rules/worldspace/2.1/th-has-data-cells).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = THHasDataCells;
