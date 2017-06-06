/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util.js');
const TracingProcessor = require('../lib/traces/tracing-processor');
const Formatter = require('../report/formatter');

// Parameters (in ms) for log-normal CDF scoring. To see the curve:
// https://www.desmos.com/calculator/joz3pqttdq
const SCORING_POINT_OF_DIMINISHING_RETURNS = 1600;
const SCORING_MEDIAN = 4000;


class FirstMeaningfulPaint extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'first-meaningful-paint',
      description: 'First meaningful paint',
      optimalValue: `< ${SCORING_POINT_OF_DIMINISHING_RETURNS.toLocaleString()} ms`,
      helpText: 'First meaningful paint measures when the primary content of a page is visible. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/first-meaningful-paint).',
      scoringMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces']
    };
  }

  /**
   * Audits the page to give a score for First Meaningful Paint.
   * @see https://github.com/GoogleChrome/lighthouse/issues/26
   * @see https://docs.google.com/document/d/1BR94tJdZLsin5poeet0XoTW60M0SjvOJQttKT-JK8HI/view
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @return {!Promise<!AuditResult>} The score from the audit, ranging from 0-100.
   */
  static audit(artifacts) {
    const trace = artifacts.traces[this.DEFAULT_PASS];
    return artifacts.requestTraceOfTab(trace).then(tabTrace => {
      if (!tabTrace.firstMeaningfulPaintEvt) {
        throw new Error('No usable `firstMeaningfulPaint(Candidate)` events found in trace');
      }

      // navigationStart is currently essential to FMP calculation.
      // see: https://github.com/GoogleChrome/lighthouse/issues/753
      if (!tabTrace.navigationStartEvt) {
        throw new Error('No `navigationStart` event found in trace');
      }

      const result = this.calculateScore(tabTrace);

      return {
        score: result.score,
        rawValue: parseFloat(result.duration),
        displayValue: Util.formatMilliseconds(result.duration),
        debugString: result.debugString,
        optimalValue: this.meta.optimalValue,
        extendedInfo: {
          value: result.extendedInfo,
          formatter: Formatter.SUPPORTED_FORMATS.NULL
        }
      };
    });
  }

  static calculateScore(traceOfTab) {
    // Expose the raw, unchanged monotonic timestamps from the trace, along with timing durations
    const extendedInfo = {
      timestamps: {
        navStart: traceOfTab.timestamps.navigationStart * 1000,
        fCP: traceOfTab.timestamps.firstContentfulPaint * 1000,
        fMP: traceOfTab.timestamps.firstMeaningfulPaint * 1000,
        onLoad: traceOfTab.timestamps.onLoad * 1000,
        endOfTrace: traceOfTab.timestamps.traceEnd * 1000,
      },
      timings: {
        navStart: 0,
        fCP: traceOfTab.timings.firstContentfulPaint,
        fMP: traceOfTab.timings.firstMeaningfulPaint,
        onLoad: traceOfTab.timings.onLoad,
        endOfTrace: traceOfTab.timings.traceEnd,
      }
    };

    Object.keys(extendedInfo.timings).forEach(key => {
      const val = extendedInfo.timings[key];
      if (typeof val !== 'number' || Number.isNaN(val)) {
        extendedInfo.timings[key] = undefined;
        extendedInfo.timestamps[key] = undefined;
      } else {
        extendedInfo.timings[key] = parseFloat(extendedInfo.timings[key].toFixed(3));
      }
    });

    // Use the CDF of a log-normal distribution for scoring.
    //   < 1100ms: score≈100
    //   4000ms: score=50
    //   >= 14000ms: score≈0
    const firstMeaningfulPaint = traceOfTab.timings.firstMeaningfulPaint;
    const distribution = TracingProcessor.getLogNormalDistribution(SCORING_MEDIAN,
        SCORING_POINT_OF_DIMINISHING_RETURNS);
    let score = 100 * distribution.computeComplementaryPercentile(firstMeaningfulPaint);

    // Clamp the score to 0 <= x <= 100.
    score = Math.min(100, score);
    score = Math.max(0, score);

    return {
      duration: firstMeaningfulPaint.toFixed(1),
      score: Math.round(score),
      rawValue: firstMeaningfulPaint,
      extendedInfo
    };
  }
}

module.exports = FirstMeaningfulPaint;
