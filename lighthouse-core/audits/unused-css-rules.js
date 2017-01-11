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

const Audit = require('./audit');
const Formatter = require('../formatters/formatter');

const PREVIEW_LENGTH = 100;
const ALLOWABLE_UNUSED_RULES_RATIO = 0.10;

class UnusedCSSRules extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Best Practices',
      name: 'unused-css-rules',
      description: 'Site does not have more than 10% unused CSS',
      helpText: 'Remove unused rules from stylesheets to reduce unnecessary ' +
          'bytes consumed by network activity. [Learn more](https://developers.google.com/speed/docs/insights/OptimizeCSSDelivery)',
      requiredArtifacts: ['CSSUsage', 'Styles']
    };
  }

  /**
   * @param {!Array.<{header: {styleSheetId: string}}>} styles The output of the Styles gatherer.
   * @return {!Object} A map of styleSheetId to stylesheet information.
   */
  static indexStylesheetsById(styles) {
    return styles.reduce((indexed, stylesheet) => {
      indexed[stylesheet.header.styleSheetId] = Object.assign({
        used: [],
        unused: [],
      }, stylesheet);
      return indexed;
    }, {});
  }

  /**
   * Counts the number of unused rules and adds count information to sheets.
   * @param {!Array.<{styleSheetId: string, used: boolean}>} rules The output of the CSSUsage gatherer.
   * @param {!Object} indexedStylesheets Stylesheet information indexed by id.
   * @return {number} The number of unused rules.
   */
  static countUnusedRules(rules, indexedStylesheets) {
    let unused = 0;

    rules.forEach(rule => {
      const stylesheetInfo = indexedStylesheets[rule.styleSheetId];

      if (rule.used) {
        stylesheetInfo.used.push(rule);
      } else {
        unused++;
        stylesheetInfo.unused.push(rule);
      }
    });

    return unused;
  }

  /**
   * @param {!Object} stylesheetInfo The stylesheetInfo object.
   * @return {!{url: string, label: string, code: string}} The result for the URLLIST formatter.
   */
  static mapSheetToResult(stylesheetInfo) {
    const numUsed = stylesheetInfo.used.length;
    const numUnused = stylesheetInfo.unused.length;
    const percentUsed = Math.round(100 * numUsed / (numUsed + numUnused)) || 0;

    let contentPreview = stylesheetInfo.content;
    if (contentPreview.length > PREVIEW_LENGTH) {
      const firstRuleStart = contentPreview.indexOf('{');
      const firstRuleEnd = contentPreview.indexOf('}');
      if (firstRuleStart === -1 || firstRuleEnd === -1
          || firstRuleStart > firstRuleEnd
          || firstRuleStart > PREVIEW_LENGTH) {
        contentPreview = contentPreview.slice(0, PREVIEW_LENGTH) + '...';
      } else if (firstRuleEnd < PREVIEW_LENGTH) {
        contentPreview = contentPreview.slice(0, firstRuleEnd + 1) + ' ...';
      } else {
        const lastSemicolonIndex = contentPreview.slice(0, PREVIEW_LENGTH).lastIndexOf(';');
        contentPreview = lastSemicolonIndex < firstRuleStart ?
            contentPreview.slice(0, PREVIEW_LENGTH) + '... } ...' :
            contentPreview.slice(0, lastSemicolonIndex + 1) + ' ... } ...';
      }
    }

    return {
      url: stylesheetInfo.header.sourceURL || 'inline',
      label: `${percentUsed}% rules used`,
      code: contentPreview.trim(),
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const styles = artifacts.Styles;
    const usage = artifacts.CSSUsage;

    if (styles.rawValue === -1) {
      return UnusedCSSRules.generateAuditResult(styles);
    } else if (usage.rawValue === -1) {
      return UnusedCSSRules.generateAuditResult(usage);
    }

    const indexedSheets = UnusedCSSRules.indexStylesheetsById(styles);
    const unused = UnusedCSSRules.countUnusedRules(usage, indexedSheets);
    const unusedRatio = (unused / usage.length) || 0;
    const results = Object.keys(indexedSheets).map(sheetId => {
      return UnusedCSSRules.mapSheetToResult(indexedSheets[sheetId]);
    });


    let displayValue = '';
    if (unused > 1) {
      displayValue = `${unused} CSS rules were unused`;
    } else if (unused === 1) {
      displayValue = `${unused} CSS rule was unused`;
    }

    return UnusedCSSRules.generateAuditResult({
      displayValue,
      rawValue: unusedRatio < ALLOWABLE_UNUSED_RULES_RATIO,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: results
      }
    });
  }
}

module.exports = UnusedCSSRules;
