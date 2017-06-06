/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to see if it is using the obsolete
 *     `display: box` flexbox.
 */

'use strict';

const Audit = require('../audit');
const URL = require('../../lib/url-shim');
const StyleHelpers = require('../../lib/styles-helpers');
const Formatter = require('../../report/formatter');

class NoOldFlexboxAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'CSS',
      name: 'no-old-flexbox',
      description: 'Avoids old CSS flexbox',
      helpText: 'The 2009 spec of Flexbox is deprecated and is 2.3x slower than the latest ' +
          'spec. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/old-flexbox).',
      requiredArtifacts: ['Styles', 'URL']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    // https://www.w3.org/TR/2009/WD-css3-flexbox-20090723/
    // (e.g. box-flex, box-orient, box-flex-group, display: flexbox (2011 version))
    const displayPropResults = StyleHelpers.filterStylesheetsByUsage(artifacts.Styles,
        'display', StyleHelpers.addVendorPrefixes(['box', 'flexbox']));
    const otherPropResults = StyleHelpers.filterStylesheetsByUsage(artifacts.Styles,
        StyleHelpers.addVendorPrefixes(['box-flex', 'box-orient', 'box-flex-group']));

    const sheetsUsingOldFlexbox = displayPropResults.concat(otherPropResults);

    const pageUrl = artifacts.URL.finalUrl;

    const urlList = [];
    sheetsUsingOldFlexbox.forEach(sheet => {
      sheet.parsedContent.forEach(props => {
        const formattedStyleRule = StyleHelpers.getFormattedStyleRule(sheet.content, props);

        let url = sheet.header.sourceURL;
        if (!URL.isValid(url) || url === pageUrl) {
          url = 'inline';
        } else {
          url = URL.getURLDisplayName(url);
        }

        urlList.push({
          url,
          location: formattedStyleRule.location,
          startLine: formattedStyleRule.startLine,
          pre: formattedStyleRule.styleRule
        });
      });
    });

    return {
      rawValue: sheetsUsingOldFlexbox.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.TABLE,
        value: {
          results: urlList,
          tableHeadings: {
            url: 'URL', startLine: 'Line in the stylesheet / <style>', location: 'Column start/end',
            pre: 'Snippet'}
        }
      }
    };
  }
}

module.exports = NoOldFlexboxAudit;
