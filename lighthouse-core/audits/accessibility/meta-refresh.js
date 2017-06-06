/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures `<meta http-equiv="refresh">` is not used.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class MetaRefresh extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'meta-refresh',
      description: 'The document does not use `<meta http-equiv="refresh">`.',
      helpText: 'Users do not expect a page to refresh automatically, and doing so will move ' +
          'focus back to the top of the page. This may create a frustrating or ' +
          'confusing experience. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/1.1/meta-refresh).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = MetaRefresh;
