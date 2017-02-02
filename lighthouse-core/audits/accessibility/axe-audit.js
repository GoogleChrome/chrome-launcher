/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
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
 * @fileoverview Base class for all aXe audits. Provides a consistent way to
 * generate audit results using aXe rule names.
 */

const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

class AxeAudit extends Audit {
  /**
   * @param {!Artifacts} artifacts Accessibility gatherer artifacts. Note that AxeAudit
   * expects the meta name for the class to match the rule id from aXe.
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const violations = artifacts.Accessibility.violations;
    const rule = violations.find(result => result.id === this.meta.name);

    return this.generateAuditResult({
      rawValue: typeof rule === 'undefined',
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.ACCESSIBILITY,
        value: rule
      }
    });
  }
}

module.exports = AxeAudit;
