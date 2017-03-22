/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
      helpText: 'The presence of `<th>`, `<caption>` or the `summary` attribute on a ' +
          'presentational table may produce a confusing experince for a screen reader user as ' +
          'these elements usually indicates a data table.',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = LayoutTable;
