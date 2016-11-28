/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const Audit = require('./audit');
const TracingProcessor = require('../lib/traces/tracing-processor');
const FMPMetric = require('./first-meaningful-paint');
const Formatter = require('../formatters/formatter');

// Parameters (in ms) for log-normal CDF scoring. To see the curve:
//   https://www.desmos.com/calculator/jlrx14q4w8
const SCORING_POINT_OF_DIMINISHING_RETURNS = 1700;
const SCORING_MEDIAN = 5000;
// This aligns with the external TTI targets in https://goo.gl/yXqxpL
const SCORING_TARGET = 5000;

class TTIMetric extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'time-to-interactive',
      description: 'Time To Interactive (alpha)',
      helpText: 'Time to Interactive identifies the time at which your app appears to be ready enough to interact with. <a href="https://developers.google.com/web/tools/lighthouse/audits/time-to-interactive" target="_blank" rel="noopener noreferrer">Learn more</a>.',
      optimalValue: SCORING_TARGET.toLocaleString() + 'ms',
      requiredArtifacts: ['traceContents']
    };
  }

  /**
   * Identify the time the page is "interactive"
   * @see https://docs.google.com/document/d/1oiy0_ych1v2ADhyG_QW7Ps4BNER2ShlJjx2zCbVzVyY/edit#
   *
   * The user thinks the page is ready - (They believe the page is done enough to start interacting with)
   *   - Layout has stabilized & key webfonts are visible.
   *     AKA: First meaningful paint has fired.
   *   - Page is nearly visually complete
   *     Visual completion is 85%
   *
   * The page is actually ready for user:
   *   - domContentLoadedEventEnd has fired
   *     Definition: HTML parsing has finished, all DOMContentLoaded handlers have run.
   *     No risk of DCL event handlers changing the page
   *     No surprises of inactive buttons/actions as DOM element event handlers should be bound
   *   - The main thread is available enough to handle user input
   *     first 500ms window where Est Input Latency is <50ms at the 90% percentile.
   *
   * WARNING: This metric WILL change its calculation. If you rely on its numbers now, know that they
   * will be changing in the future to a more accurate number.
   *
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @return {!Promise<!AuditResult>} The score from the audit, ranging from 0-100.
   */
  static audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const pendingSpeedline = artifacts.requestSpeedline(trace);
    const pendingFMP = FMPMetric.audit(artifacts);

    // We start looking at Math.Max(FMPMetric, visProgress[0.85])
    return Promise.all([pendingSpeedline, pendingFMP]).then(results => {
      const speedline = results[0];
      const fmpResult = results[1];
      if (fmpResult.rawValue === -1) {
        return generateError(fmpResult.debugString);
      }
      const fmpTiming = parseFloat(fmpResult.rawValue);
      const timings = fmpResult.extendedInfo && fmpResult.extendedInfo.value &&
          fmpResult.extendedInfo.value.timings;

      // Process the trace
      const tracingProcessor = new TracingProcessor();
      const trace = artifacts.traces[Audit.DEFAULT_PASS];
      const model = tracingProcessor.init(trace);
      const endOfTraceTime = model.bounds.max;

      // TODO: Wait for DOMContentLoadedEndEvent
      const fMPts = timings.fMPfull + timings.navStart;

      // look at speedline results for 85% starting at FMP
      let visuallyReadyTiming = 0;

      if (speedline.frames) {
        const eightyFivePctVC = speedline.frames.find(frame => {
          return frame.getTimeStamp() >= fMPts && frame.getProgress() >= 85;
        });

        if (eightyFivePctVC) {
          visuallyReadyTiming = eightyFivePctVC.getTimeStamp() - timings.navStart;
        }
      }

      // Find first 500ms window where Est Input Latency is <50ms at the 90% percentile.
      let startTime = Math.max(fmpTiming, visuallyReadyTiming) - 50;
      let endTime;
      let currentLatency = Infinity;
      const percentiles = [0.9]; // [0.75, 0.9, 0.99, 1];
      const threshold = 50;
      const foundLatencies = [];

      // When we've found a latency that's good enough, we're good.
      while (currentLatency > threshold) {
        // While latency is too high, increment just 50ms and look again.
        startTime += 50;
        endTime = startTime + 500;
        // If there's no more room in the trace to look, we're done.
        if (endTime > endOfTraceTime) {
          return generateError('Entire trace was found to be busy.');
        }
        // Get our expected latency for the time window
        const latencies = TracingProcessor.getRiskToResponsiveness(
          model, trace, startTime, endTime, percentiles);
        const estLatency = latencies[0].time.toFixed(2);
        foundLatencies.push({
          estLatency: estLatency,
          startTime: startTime.toFixed(1)
        });

        // Grab this latency and try the threshold again
        currentLatency = estLatency;
      }
      const timeToInteractive = parseFloat(startTime.toFixed(1));

      // Use the CDF of a log-normal distribution for scoring.
      //   < 1200ms: score≈100
      //   5000ms: score=50
      //   >= 15000ms: score≈0
      const distribution = TracingProcessor.getLogNormalDistribution(SCORING_MEDIAN,
          SCORING_POINT_OF_DIMINISHING_RETURNS);
      let score = 100 * distribution.computeComplementaryPercentile(startTime);

      // Clamp the score to 0 <= x <= 100.
      score = Math.min(100, score);
      score = Math.max(0, score);
      score = Math.round(score);

      const extendedInfo = {
        timings: {
          fMP: fmpTiming.toFixed(1),
          visuallyReady: visuallyReadyTiming.toFixed(1),
          mainThreadAvail: startTime.toFixed(1)
        },
        expectedLatencyAtTTI: currentLatency,
        foundLatencies
      };

      return TTIMetric.generateAuditResult({
        score,
        rawValue: timeToInteractive,
        displayValue: `${timeToInteractive}ms`,
        optimalValue: this.meta.optimalValue,
        debugString: speedline.debugString,
        extendedInfo: {
          value: extendedInfo,
          formatter: Formatter.SUPPORTED_FORMATS.NULL
        }
      });
    }).catch(err => {
      return generateError(err);
    });
  }
}

module.exports = TTIMetric;

function generateError(err) {
  return TTIMetric.generateAuditResult({
    value: -1,
    rawValue: -1,
    optimalValue: TTIMetric.meta.optimalValue,
    debugString: err.message || err
  });
}
