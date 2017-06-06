
/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ManualAudit = require('./manual-audit');

/**
 * @fileoverview Manual PWA audit for cross browser support.
 */

class PWACrossBrowser extends ManualAudit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return Object.assign({
      category: 'PWA',
      name: 'pwa-cross-browser',
      helpText: 'To reach the most number of users, sites should work across ' +
      'every major browser. [Learn more](https://developers.google.com/web/progressive-web-apps/checklist#site-works-cross-browser).',
      description: 'Site works cross-browser',
    }, super.meta);
  }
}

module.exports = PWACrossBrowser;
