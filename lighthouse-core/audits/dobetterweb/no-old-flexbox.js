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

/**
 * @fileoverview Audit a page to see if it is using the obsolete
 *     `display: box` flexbox.
 */

'use strict';

const Audit = require('../audit');
const StyleHelpers = require('../../lib/styles-helpers');
const Formatter = require('../../formatters/formatter');

class NoOldFlexboxAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'CSS',
      name: 'no-old-flexbox',
      description: 'Site does not use the old CSS flexbox',
      helpText: 'The 2009 spec of Flexbox is deprecated and is 2.3x slower than the latest ' +
          'spec. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/old-flexbox).',
      requiredArtifacts: ['Styles']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (artifacts.Styles.rawValue === -1) {
      return NoOldFlexboxAudit.generateAuditResult(artifacts.Styles);
    }

    // https://www.w3.org/TR/2009/WD-css3-flexbox-20090723/
    // (e.g. box-flex, box-orient, box-flex-group, display: flexbox (2011 version))
    const propsNames = ['box-flex', 'box-orient', 'box-flex-group', 'display'];
    const propsNamesWithPrefixes = StyleHelpers.addVendorPrefixes(propsNames);
    const propsValues = ['box', 'flexbox'];
    const sheetsUsingDisplayBox = StyleHelpers.filterStylesheetsByUsage(
        artifacts.Styles, propsNamesWithPrefixes, propsValues);
    const urlList = [];
    sheetsUsingDisplayBox.forEach(sheet => {
      sheet.parsedContent.forEach(props => {
        const formattedStyleRule = StyleHelpers.getFormattedStyleRule(sheet.content, props);
        urlList.push({
          url: sheet.header.sourceURL,
          label: formattedStyleRule.location,
          code: formattedStyleRule.styleRule
        });
      });
    });

    return NoOldFlexboxAudit.generateAuditResult({
      rawValue: sheetsUsingDisplayBox.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: urlList
      }
    });
  }
}

module.exports = NoOldFlexboxAudit;
