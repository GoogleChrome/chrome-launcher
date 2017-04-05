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

const DEFAULT_PASS = 'defaultPass';

class Audit {
  /**
   * @return {!string}
   */
  static get DEFAULT_PASS() {
    return DEFAULT_PASS;
  }

  /**
   * @return {{NUMERIC: string, BINARY: string}}
   */
  static get SCORING_MODES() {
    return {
      NUMERIC: 'numeric',
      BINARY: 'binary',
    };
  }

  /**
   * @throws {Error}
   */
  static get meta() {
    throw new Error('Audit meta information must be overridden.');
  }

  /**
   * @param {!Audit} audit
   * @param {string} debugString
   * @return {!AuditFullResult}
   */
  static generateErrorAuditResult(audit, debugString) {
    return Audit.generateAuditResult(audit, {
      rawValue: null,
      error: true,
      debugString
    });
  }

  /**
   * @param {!Audit} audit
   * @param {!AuditResult} result
   * @return {!AuditFullResult}
   */
  static generateAuditResult(audit, result) {
    if (typeof result.rawValue === 'undefined') {
      throw new Error('generateAuditResult requires a rawValue');
    }

    const score = typeof result.score === 'undefined' ? result.rawValue : result.score;
    let displayValue = result.displayValue;
    if (typeof displayValue === 'undefined') {
      displayValue = result.rawValue ? result.rawValue : '';
    }

    // The same value or true should be '' it doesn't add value to the report
    if (displayValue === score) {
      displayValue = '';
    }

    return {
      score,
      displayValue: `${displayValue}`,
      rawValue: result.rawValue,
      error: result.error,
      debugString: result.debugString,
      optimalValue: result.optimalValue,
      extendedInfo: result.extendedInfo,
      scoringMode: audit.meta.scoringMode || Audit.SCORING_MODES.BINARY,
      informative: audit.meta.informative,
      name: audit.meta.name,
      category: audit.meta.category,
      description: audit.meta.description,
      helpText: audit.meta.helpText,
      details: result.details,
    };
  }
}

module.exports = Audit;
