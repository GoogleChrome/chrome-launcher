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
      helpText: 'First meaningful paint measures when the primary content of a page is visible. <a href="https://developers.google.com/web/tools/lighthouse/audits/first-meaningful-paint" target="_blank" rel="noreferrer noopener">Learn more</a>.',
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

      const navStart = evts.navigationStart;
      const fMP = evts.firstMeaningfulPaint;

      var data = {
        navStart,
        fMP,
      };

      const result = this.calculateScore(data);

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

  static calculateScore(data) {
    // First meaningful paint is the last timestamp observed from the candidates
    const firstMeaningfulPaint = (data.fMP.ts - data.navStart.ts) / 1000;

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

    data.fMP = firstMeaningfulPaint;
    data.navStart = data.navStart.ts / 1000;

    return {
      duration: `${firstMeaningfulPaint.toFixed(1)}`,
      score: Math.round(score),
      rawValue: firstMeaningfulPaint.toFixed(1),
      extendedInfo: {timings: data}
    };
  }

  /**
   * @param {!Array<!Object>} traceData
   */
  static collectEvents(traceData) {
    let mainFrameID;
    let navigationStart;
    let firstMeaningfulPaint;

    // const model = new DevtoolsTimelineModel(traceData);
    // const events = model.timelineModel().mainThreadEvents();
    const events = traceData;

    // Parse the trace for our key events and sort them by timestamp.
    events.filter(e => e.cat.includes('blink.user_timing') || e.name === 'TracingStartedInPage')
    .sort((event0, event1) => {
      return event0.ts - event1.ts;
    }).forEach(event => {
      // Grab the page's ID from the first TracingStartedInPage in the trace
      if (event.name === 'TracingStartedInPage' && !mainFrameID) {
        mainFrameID = event.args.data.page;
      }

      // Record the navigationStart, but only once TracingStartedInPage has started
      // which is when mainFrameID exists
      if (event.name === 'navigationStart' && !!mainFrameID && !navigationStart) {
        navigationStart = event;
      }
      if (event.name === 'firstMeaningfulPaint' && event.args.frame === mainFrameID &&
          !!navigationStart && event.ts >= navigationStart.ts) {
        firstMeaningfulPaint = event;
      }
    });

    // navigationStart is currently essential to FMP calculation.
    // see: https://github.com/GoogleChrome/lighthouse/issues/753
    if (!navigationStart) {
      throw new Error('No `navigationStart` event found after `TracingStartedInPage` in trace');
    }

    return {
      navigationStart,
      firstMeaningfulPaint,
    };
  }
}

module.exports = FirstMeaningfulPaint;
