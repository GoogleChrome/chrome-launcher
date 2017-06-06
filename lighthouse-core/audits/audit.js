/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
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
   * @param {!Audit.Headings} headings
   * @return {!Array<string>}
   */
  static makeV1TableHeadings(headings) {
    const tableHeadings = {};
    headings.forEach(heading => tableHeadings[heading.key] = heading.text);
    return tableHeadings;
  }

  /**
   * Table cells will use the type specified in headings[x].itemType. However a custom type
   * can be provided: results[x].propName = {type: 'code', text: '...'}
   * @param {!Audit.Headings} headings
   * @param {!Array<!Object<string, *>>} results
   * @return {!Array<!DetailsRenderer.DetailsJSON>}
   */
  static makeV2TableRows(headings, results) {
    const tableRows = results.map(item => {
      return headings.map(heading => {
        const value = item[heading.key];
        if (typeof value === 'object' && value && value.type) return value;

        return {
          type: heading.itemType,
          text: value
        };
      });
    });
    return tableRows;
  }

  /**
   * @param {!Audit.Headings} headings
   * @return {!Array<!DetailsRenderer.DetailsJSON>}
   */
  static makeV2TableHeaders(headings) {
    return headings.map(heading => ({
      type: 'text',
      itemType: heading.itemType,
      text: heading.text
    }));
  }

  /**
   * @param {!Audit.Headings} headings
   * @param {!Array<!Object<string, string>>} results
   * @return {!DetailsRenderer.DetailsJSON}
   */
  static makeV2TableDetails(headings, results) {
    const v2TableHeaders = Audit.makeV2TableHeaders(headings);
    const v2TableRows = Audit.makeV2TableRows(headings, results);
    return {
      type: 'table',
      header: 'View Details',
      itemHeaders: v2TableHeaders,
      items: v2TableRows
    };
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
      manual: audit.meta.manual,
      name: audit.meta.name,
      category: audit.meta.category,
      description: audit.meta.description,
      helpText: audit.meta.helpText,
      details: result.details,
    };
  }
}

module.exports = Audit;

/** @typedef {
 * !Array<{
 *   key: string,
 *   itemType: string,
 *   text: string,
 * }>}
 */
Audit.Headings; // eslint-disable-line no-unused-expressions

/** @typedef {{
 *   results: !Array<!Object<string, string>>,
 *   headings: !Audit.Headings,
 *   passes: boolean,
 *   debugString: (string|undefined)
 * }}
 */
Audit.HeadingsResult; // eslint-disable-line no-unused-expressions
