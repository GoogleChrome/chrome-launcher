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
// https://www.desmos.com/calculator/srv0hqhf7d
const SCORING_POINT_OF_DIMINISHING_RETURNS = 50;
const SCORING_MEDIAN = 100;

class EstimatedInputLatency extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'estimated-input-latency',
      description: 'Estimated Input Latency',
      optimalValue: `< ${SCORING_POINT_OF_DIMINISHING_RETURNS.toLocaleString()} ms`,
      helpText: 'The score above is an estimate of how long your app takes to respond to user ' +
          'input, in milliseconds. There is a 90% probability that a user encounters this amount ' +
          'of latency, or less. 10% of the time a user can expect additional latency. If your ' +
          'score is higher than Lighthouse\'s target score, users may perceive your app as ' +
          'laggy. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/estimated-input-latency).',
      scoringMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces']
    };
  }

  static calculate(tabTrace) {
    const startTime = tabTrace.timings.firstMeaningfulPaint;
    if (!startTime) {
      throw new Error('No firstMeaningfulPaint event found in trace');
    }

    const latencyPercentiles = TracingProcessor.getRiskToResponsiveness(tabTrace, startTime);
    const ninetieth = latencyPercentiles.find(result => result.percentile === 0.9);
    const rawValue = parseFloat(ninetieth.time.toFixed(1));

    // Use the CDF of a log-normal distribution for scoring.
    //  10th Percentile ≈ 58ms
    //  25th Percentile ≈ 75ms
    //  Median = 100ms
    //  75th Percentile ≈ 133ms
    //  95th Percentile ≈ 199ms
    const distribution = TracingProcessor.getLogNormalDistribution(SCORING_MEDIAN,
        SCORING_POINT_OF_DIMINISHING_RETURNS);
    const score = 100 * distribution.computeComplementaryPercentile(ninetieth.time);

    return {
      score: Math.round(score),
      optimalValue: EstimatedInputLatency.meta.optimalValue,
      rawValue,
      displayValue: Util.formatMilliseconds(rawValue, 1),
      extendedInfo: {
        value: latencyPercentiles,
        formatter: Formatter.SUPPORTED_FORMATS.NULL
      }
    };
  }

  /**
   * Audits the page to estimate input latency.
   * @see https://github.com/GoogleChrome/lighthouse/issues/28
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @return {!Promise<!AuditResult>} The score from the audit, ranging from 0-100.
   */
  static audit(artifacts) {
    const trace = artifacts.traces[this.DEFAULT_PASS];

    return artifacts.requestTraceOfTab(trace)
        .then(EstimatedInputLatency.calculate);
  }
}

module.exports = EstimatedInputLatency;
