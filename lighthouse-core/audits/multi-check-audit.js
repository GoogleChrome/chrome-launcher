/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Base class for boolean audits that can have multiple reasons for failure
 */

const Audit = require('./audit');
const Formatter = require('../report/formatter');

class MultiCheckAudit extends Audit {
  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    return Promise.resolve(this.audit_(artifacts)).then(result => this.createAuditResult(result));
  }

  /**
   * @param {!{failures: !Array<!string>, themeColor: ?string, manifestValues: ?Object, }} result
   * @return {!AuditResult}
   */
  static createAuditResult(result) {
    const extendedInfo = {
      value: result,
      formatter: Formatter.SUPPORTED_FORMATS.NULL
    };

    // If we fail, share the failures
    if (result.failures.length > 0) {
      return {
        rawValue: false,
        debugString: `Failures: ${result.failures.join(', ')}.`,
        extendedInfo
      };
    }

    // Otherwise, we pass
    return {
      rawValue: true,
      extendedInfo
    };
  }

  /**
   * @param {!Artifacts} artifacts
   */
  static audit_() {
    throw new Error('audit_ unimplemented');
  }
}

module.exports = MultiCheckAudit;
