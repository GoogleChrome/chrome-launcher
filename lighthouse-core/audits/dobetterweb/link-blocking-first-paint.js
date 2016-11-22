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
 * @fileoverview Audit a page to see if it does not use <link> that block first paint.
 */

'use strict';

const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

class LinkBlockingFirstPaintAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'link-blocking-first-paint',
      description: 'Site does not use <link> that delay first paint',
      helpText: '&lt;link> elements are <a href="https://developers.google.com/web/fundamentals/performance/critical-rendering-path/analyzing-crp" target="_blank">delaying the first paint</a> of your page! For stylesheets, consider inlining or using the <code>disabled</code> and <code>media</code> attributes. For HTML Imports, use the <code>async</code> attribute. These techniques will <a href="https://developers.google.com/web/fundamentals/performance/critical-rendering-path/render-blocking-css" target="_blank">make the resource(s) non-render blocking</a>.',
      requiredArtifacts: ['TagsBlockingFirstPaint']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @param {string} tagFilter The tagName to filter on
   * @return {!Object} The object to pass to `generateAuditResult`
   */
  static computeAuditResultForTags(artifacts, tagFilter) {
    const artifact = artifacts.TagsBlockingFirstPaint;
    if (typeof artifact === 'undefined' || artifact.value === -1) {
      return {
        rawValue: -1,
        debugString: 'TagsBlockingFirstPaint gatherer did not run'
      };
    }

    let totalSpendTime = 0;
    const results = artifact.items
      .filter(item => item.tag.tagName === tagFilter)
      .map(item => {
        totalSpendTime += item.spendTime;

        return {
          url: item.tag.url,
          label: `delayed first paint by ${item.spendTime}ms`
        };
      });

    let displayValue = '';
    if (results.length > 1) {
      displayValue = `${results.length} resources delayed first paint by ${totalSpendTime}ms`;
    } else if (results.length === 1) {
      displayValue = `${results.length} resource delayed first paint by ${totalSpendTime}ms`;
    }

    return {
      displayValue,
      rawValue: results.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: results
      }
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const result = LinkBlockingFirstPaintAudit.computeAuditResultForTags(artifacts, 'LINK');
    return LinkBlockingFirstPaintAudit.generateAuditResult(result);
  }
}

module.exports = LinkBlockingFirstPaintAudit;
