/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to see if it does not use <link> that block first paint.
 */

'use strict';

const Audit = require('../audit');
const Formatter = require('../../report/formatter');
const scoreForWastedMs = require('../byte-efficiency/byte-efficiency-audit').scoreForWastedMs;

// Because of the way we detect blocking stylesheets, asynchronously loaded
// CSS with link[rel=preload] and an onload handler (see https://github.com/filamentgroup/loadCSS)
// can be falsely flagged as blocking. Therefore, ignore stylesheets that loaded fast enough
// to possibly be non-blocking (and they have minimal impact anyway).
const LOAD_THRESHOLD_IN_MS = 50;

class LinkBlockingFirstPaintAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'link-blocking-first-paint',
      description: 'Reduce render-blocking stylesheets',
      informative: true,
      helpText: 'Link elements are blocking the first paint of your page. Consider ' +
          'inlining critical links and deferring non-critical ones. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/blocking-resources).',
      requiredArtifacts: ['TagsBlockingFirstPaint', 'traces']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @param {string} tagFilter The tagName to filter on
   * @param {number=} endTimeMax The trace milisecond timestamp that offending tags must have ended
   *    before (typically first contentful paint).
   * @param {number=} loadDurationThreshold Filter to resources that took at least this
   *    many milliseconds to load.
   * @return {!AuditResult} The object to pass to `generateAuditResult`
   */
  static computeAuditResultForTags(artifacts, tagFilter, endTimeMax = Infinity,
      loadDurationThreshold = 0) {
    const artifact = artifacts.TagsBlockingFirstPaint;

    const filtered = artifact.filter(item => {
      return item.tag.tagName === tagFilter &&
        (item.endTime - item.startTime) * 1000 >= loadDurationThreshold &&
        item.endTime * 1000 < endTimeMax;
    });

    const startTime = filtered.length === 0 ? 0 :
        filtered.reduce((t, item) => Math.min(t, item.startTime), Number.MAX_VALUE);
    let endTime = 0;

    const results = filtered.map(item => {
      endTime = Math.max(item.endTime, endTime);

      return {
        url: item.tag.url,
        totalKb: `${Math.round(item.transferSize / 1024)} KB`,
        totalMs: `${Math.round((item.endTime - startTime) * 1000)}ms`
      };
    });

    const delayTime = Math.round((endTime - startTime) * 1000);
    let displayValue = '';
    if (results.length > 1) {
      displayValue = `${results.length} resources delayed first paint by ${delayTime}ms`;
    } else if (results.length === 1) {
      displayValue = `${results.length} resource delayed first paint by ${delayTime}ms`;
    }

    const headings = [
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'totalKb', itemType: 'text', text: 'Size (KB)'},
      {key: 'totalMs', itemType: 'text', text: 'Delayed Paint By (ms)'},
    ];

    const v1TableHeadings = Audit.makeV1TableHeadings(headings);
    const v2TableDetails = Audit.makeV2TableDetails(headings, results);

    return {
      displayValue,
      score: scoreForWastedMs(delayTime),
      rawValue: delayTime,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.TABLE,
        value: {
          wastedMs: delayTime,
          results,
          tableHeadings: v1TableHeadings
        }
      },
      details: v2TableDetails
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    return artifacts.requestTraceOfTab(trace).then(traceOfTab => {
      const fcp = traceOfTab.timestamps.firstContentfulPaint;
      return this.computeAuditResultForTags(artifacts, 'LINK', fcp, LOAD_THRESHOLD_IN_MS);
    });
  }
}

module.exports = LinkBlockingFirstPaintAudit;
