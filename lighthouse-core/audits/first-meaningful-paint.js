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

const Audit = require('./audit');
const TracingProcessor = require('../lib/traces/tracing-processor');
const Formatter = require('../formatters/formatter');

// Parameters (in ms) for log-normal CDF scoring. To see the curve:
// https://www.desmos.com/calculator/joz3pqttdq
const SCORING_POINT_OF_DIMINISHING_RETURNS = 1600;
const SCORING_MEDIAN = 4000;

// We want an fMP at or after our fCP, however we see traces with the sole fMP
// being up to 1ms BEFORE the fCP. We're okay if this happens, however if we see
// a gap of more than 2 frames (32,000 microseconds), then it's a bug that should
// be addressed in FirstMeaningfulPaintDetector.cpp
const FCPFMP_TOLERANCE = 32 * 1000;

class FirstMeaningfulPaint extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'first-meaningful-paint',
      description: 'First meaningful paint',
      optimalValue: SCORING_POINT_OF_DIMINISHING_RETURNS.toLocaleString() + 'ms',
      helpText: 'First meaningful paint measures when the primary content of a page is visible. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/first-meaningful-paint).',
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
    return new Promise((resolve, reject) => {
      const traceContents = artifacts.traces[this.DEFAULT_PASS].traceEvents;
      const evts = this.collectEvents(traceContents);
      const result = this.calculateScore(evts);

      resolve(FirstMeaningfulPaint.generateAuditResult({
        score: result.score,
        rawValue: parseFloat(result.duration),
        displayValue: `${result.duration}ms`,
        debugString: result.debugString,
        optimalValue: this.meta.optimalValue,
        extendedInfo: {
          value: result.extendedInfo,
          formatter: Formatter.SUPPORTED_FORMATS.NULL
        }
      }));
    }).catch(err => {
      // Recover from trace parsing failures.
      return FirstMeaningfulPaint.generateAuditResult({
        rawValue: -1,
        debugString: err.message
      });
    });
  }

  static calculateScore(evts) {
    const firstMeaningfulPaint = (evts.firstMeaningfulPaint.ts - evts.navigationStart.ts) / 1000;
    const firstContentfulPaint = (evts.firstContentfulPaint.ts - evts.navigationStart.ts) / 1000;

    // Expose the raw, unchanged monotonic timestamps from the trace, along with timing durations
    const extendedInfo = {
      timestamps: {
        navStart: evts.navigationStart.ts,
        fCP: evts.firstContentfulPaint.ts,
        fMP: evts.firstMeaningfulPaint.ts
      },
      timings: {
        navStart: 0,
        fCP: parseFloat(firstContentfulPaint.toFixed(3)),
        fMP: parseFloat(firstMeaningfulPaint.toFixed(3))
      }
    };

    // Use the CDF of a log-normal distribution for scoring.
    //   < 1100ms: score≈100
    //   4000ms: score=50
    //   >= 14000ms: score≈0
    const distribution = TracingProcessor.getLogNormalDistribution(SCORING_MEDIAN,
        SCORING_POINT_OF_DIMINISHING_RETURNS);
    let score = 100 * distribution.computeComplementaryPercentile(firstMeaningfulPaint);

    // Clamp the score to 0 <= x <= 100.
    score = Math.min(100, score);
    score = Math.max(0, score);

    return {
      duration: `${firstMeaningfulPaint.toFixed(1)}`,
      score: Math.round(score),
      rawValue: parseFloat(firstMeaningfulPaint.toFixed(1)),
      extendedInfo
    };
  }

  /**
   * @param {!Array<!Object>} traceData
   */
  static collectEvents(traceData) {
    // Parse the trace for our key events and sort them by timestamp.
    const events = traceData.filter(e => {
      return e.cat.includes('blink.user_timing') || e.name === 'TracingStartedInPage';
    }).sort((event0, event1) => event0.ts - event1.ts);

    // The first TracingStartedInPage in the trace is definitely our renderer thread of interest
    // Beware: the tracingStartedInPage event can appear slightly after a navigationStart
    const startedInPageEvt = events.find(e => e.name === 'TracingStartedInPage');
    // Filter to just events matching the frame ID for sanity
    const frameEvents = events.filter(e => e.args.frame === startedInPageEvt.args.data.page);

    // Find our first FCP
    const firstFCP = frameEvents.find(e => e.name === 'firstContentfulPaint');
    // Our navStart will be the latest one before fCP.
    const navigationStart = frameEvents.filter(e =>
        e.name === 'navigationStart' && e.ts < firstFCP.ts).pop();
    // fMP will follow at/after the FCP, though we allow some timestamp tolerance
    const firstMeaningfulPaint = frameEvents.find(e =>
        e.name === 'firstMeaningfulPaint' && e.ts >= (firstFCP.ts - FCPFMP_TOLERANCE));

    // Sometimes fMP is triggered before fCP
    if (!firstMeaningfulPaint) {
      throw new Error('No usable `firstMeaningfulPaint` event found in trace');
    }

    // navigationStart is currently essential to FMP calculation.
    // see: https://github.com/GoogleChrome/lighthouse/issues/753
    if (!navigationStart) {
      throw new Error('No `navigationStart` event found in trace');
    }

    return {
      navigationStart,
      firstMeaningfulPaint,
      firstContentfulPaint: firstFCP
    };
  }
}

module.exports = FirstMeaningfulPaint;
