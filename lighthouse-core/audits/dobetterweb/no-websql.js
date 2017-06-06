/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to ensure that it does not open a database using
 * the WebSQL API.
 */

'use strict';

const Audit = require('../audit');

class NoWebSQLAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Offline',
      name: 'no-websql',
      description: 'Avoids WebSQL DB',
      helpText: 'Web SQL is deprecated. Consider using IndexedDB instead. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/web-sql).',
      requiredArtifacts: ['WebSQL']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const db = artifacts.WebSQL;
    const debugString = (db ?
        `Found database "${db.name}", version: ${db.version}.` : '');

    return {
      rawValue: !db,
      debugString
    };
  }
}

module.exports = NoWebSQLAudit;
