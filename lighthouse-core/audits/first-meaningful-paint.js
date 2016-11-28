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

const FAILURE_MESSAGE = 'Navigation and first paint timings not found.';

// Parameters (in ms) for log-normal CDF scoring. To see the curve:
// https://www.desmos.com/calculator/joz3pqttdq
const SCORING_POINT_OF_DIMINISHING_RETURNS = 1600;
const SCORING_MEDIAN = 4000;

const BLOCK_FIRST_MEANINGFUL_PAINT_IF_BLANK_CHARACTERS_MORE_THAN = 200;

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
      requiredArtifacts: ['traceContents']
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
      if (!traceContents || !Array.isArray(traceContents)) {
        throw new Error(FAILURE_MESSAGE);
      }
      const evts = this.collectEvents(traceContents);

      const navStart = evts.navigationStart;
      const fCP = evts.firstContentfulPaint;
      const fMPbasic = this.findFirstMeaningfulPaint(evts, {});
      const fMPpageheight = this.findFirstMeaningfulPaint(evts, {pageHeight: true});
      const fMPwebfont = this.findFirstMeaningfulPaint(evts, {webFont: true});
      const fMPfull = this.findFirstMeaningfulPaint(evts, {pageHeight: true, webFont: true});

      var data = {
        navStart,
        fmpCandidates: {
          fCP,
          fMPbasic,
          fMPpageheight,
          fMPwebfont,
          fMPfull
        }
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
    // there are a few candidates for fMP:
    // * firstContentfulPaint: the first time that text or image content was painted.
    // * fMP basic: paint after most significant layout
    // * fMP page height: basic + scaling sigificance to page height
    // * fMP webfont: basic + waiting for in-flight webfonts to paint
    // * fMP full: considering both page height + webfont heuristics

    // Calculate the difference from navigation and save all candidates
    const timings = {};
    const timingsArr = [];
    Object.keys(data.fmpCandidates).forEach(name => {
      const evt = data.fmpCandidates[name];
      timings[name] = evt && ((evt.ts - data.navStart.ts) / 1000);
      timingsArr.push(timings[name]);
    });

    // First meaningful paint is the last timestamp observed from the candidates
    const firstMeaningfulPaint = timingsArr.reduce((maxTimestamp, curr) => max(maxTimestamp, curr));

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

    timings.navStart = data.navStart.ts / 1000;

    return {
      duration: `${firstMeaningfulPaint.toFixed(1)}`,
      score: Math.round(score),
      rawValue: firstMeaningfulPaint.toFixed(1),
      extendedInfo: {timings}
    };
  }

  /**
   * @param {!Array<!Object>} traceData
   */
  static collectEvents(traceData) {
    let mainFrameID;
    let navigationStart;
    let firstContentfulPaint;
    const layouts = new Map();
    const paints = [];

    // const model = new DevtoolsTimelineModel(traceData);
    // const events = model.timelineModel().mainThreadEvents();
    const events = traceData;

    // Parse the trace for our key events and sort them by timestamp.
    events.filter(e => {
      return e.cat.includes('blink.user_timing') ||
        e.name === 'FrameView::performLayout' ||
        e.name === 'Paint' ||
        e.name === 'TracingStartedInPage';
    }).sort((event0, event1) => {
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
      // firstContentfulPaint == the first time that text or image content was
      // painted. See src/third_party/WebKit/Source/core/paint/PaintTiming.h
      // COMPAT: firstContentfulPaint trace event first introduced in Chrome 49 (r370921)
      if (event.name === 'firstContentfulPaint' && event.args.frame === mainFrameID &&
          !!navigationStart && event.ts >= navigationStart.ts) {
        firstContentfulPaint = event;
      }
      // COMPAT: frame property requires Chrome 52 (r390306)
      // https://codereview.chromium.org/1922823003
      if (event.name === 'FrameView::performLayout' &&
          event.args.counters && event.args.counters.frame === mainFrameID &&
          !!navigationStart && event.ts >= navigationStart.ts) {
        layouts.set(event, event.args.counters);
      }

      if (event.name === 'Paint' && event.args.data.frame === mainFrameID &&
        !!navigationStart && event.ts >= navigationStart.ts) {
        paints.push(event);
      }
    });

    // navigationStart is currently essential to FMP calculation.
    // see: https://github.com/GoogleChrome/lighthouse/issues/753
    if (!navigationStart) {
      throw new Error('No `navigationStart` event found after `TracingStartedInPage` in trace');
    }

    return {
      navigationStart,
      firstContentfulPaint,
      layouts,
      paints
    };
  }

  static findFirstMeaningfulPaint(evts, heuristics) {
    let mostSignificantLayout;
    let significance = 0;
    let maxSignificanceSoFar = 0;
    let pending = 0;

    evts.layouts.forEach((countersObj, layoutEvent) => {
      const counter = val => countersObj[val];

      function heightRatio() {
        const ratioBefore = counter('contentsHeightBeforeLayout') / counter('visibleHeight');
        const ratioAfter = counter('contentsHeightAfterLayout') / counter('visibleHeight');
        return (max(1, ratioBefore) + max(1, ratioAfter)) / 2;
      }

      // If there are loading fonts when layout happened, the layout change accounting is postponed
      // until the font is displayed. However, icon fonts shouldn't block first meaningful paint.
      // We use a threshold that only web fonts that laid out more than 200 characters
      // should block first meaningful paint.
      //   https://docs.google.com/document/d/1BR94tJdZLsin5poeet0XoTW60M0SjvOJQttKT-JK8HI/edit#heading=h.wjx8tsc9m27r
      function hasTooManyBlankCharactersToBeMeaningful() {
        return counter('approximateBlankCharacterCount') >
            BLOCK_FIRST_MEANINGFUL_PAINT_IF_BLANK_CHARACTERS_MORE_THAN;
      }

      if (!counter('host') || counter('visibleHeight') === 0) {
        return;
      }

      const layoutCount = counter('LayoutObjectsThatHadNeverHadLayout') || 0;
      // layout significance = number of layout objects added / max(1, page height / screen height)
      significance = (heuristics.pageHeight) ? (layoutCount / heightRatio()) : layoutCount;

      if (heuristics.webFont && hasTooManyBlankCharactersToBeMeaningful()) {
        pending += significance;
      } else {
        significance += pending;
        pending = 0;
        if (significance > maxSignificanceSoFar) {
          maxSignificanceSoFar = significance;
          mostSignificantLayout = layoutEvent;
        }
      }
    });

    let paintAfterMSLayout;
    if (mostSignificantLayout) {
      paintAfterMSLayout = evts.paints.find(e => e.ts > mostSignificantLayout.ts);
    }
    return paintAfterMSLayout;
  }
}

module.exports = FirstMeaningfulPaint;

/**
 * Math.max, but with NaN values removed
 * @param {...number} _
 */
function max(_) {
  const args = [...arguments].filter(val => !isNaN(val));
  return Math.max.apply(Math, args);
}
