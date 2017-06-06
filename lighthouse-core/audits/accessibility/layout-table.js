/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures presentational `<table>` elements do not use `<th>`, `<caption>` elements
 * or the summary attribute.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class LayoutTable extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'layout-table',
      description: 'Presentational `<table>` elements avoid using `<th>`, `<caption>` or the ' +
          '`[summary]` attribute.',
      helpText: 'A table being used for layout purposes should not include data elements, ' +
          'such as the th or caption elements or the summary attribute, because this can ' +
          'create a confusing experience for screen reader users. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/1.1/layout-table).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = LayoutTable;
