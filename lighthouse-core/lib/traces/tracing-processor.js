/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

if (typeof global.window === 'undefined') {
  global.window = global;
}

// The ideal input response latency, the time between the input task and the
// first frame of the response.
const BASE_RESPONSE_LATENCY = 16;
const SCHEDULABLE_TASK_TITLE = 'TaskQueueManager::ProcessTaskFromWorkQueue';

// we need gl-matrix for traceviewer
// since it has internal forks for isNode and they get mixed up during
// browserify, we require them locally here and global-ize them.

// from catapult/tracing/tracing/base/math.html
const glMatrixModule = require('gl-matrix');
Object.keys(glMatrixModule).forEach(exportName => {
  global[exportName] = glMatrixModule[exportName];
});
global.mannwhitneyu = {};
global.HTMLImportsLoader = {};
global.HTMLImportsLoader.hrefToAbsolutePath = function(path) {
  if (path === '/gl-matrix-min.js') {
    return '../../../lib/empty-stub.js';
  }
  if (path === '/mannwhitneyu.js') {
    return '../../../lib/empty-stub.js';
  }
};

require('../../third_party/traceviewer-js/');
const traceviewer = global.tr;

class TraceProcessor {

  /**
   * Calculate duration at specified percentiles for given population of
   * durations.
   * If one of the durations overlaps the end of the window, the full
   * duration should be in the duration array, but the length not included
   * within the window should be given as `clippedLength`. For instance, if a
   * 50ms duration occurs 10ms before the end of the window, `50` should be in
   * the `durations` array, and `clippedLength` should be set to 40.
   * @see https://docs.google.com/document/d/1b9slyaB9yho91YTOkAQfpCdULFkZM9LqsipcX3t7He8/preview
   * @param {!Array<number>} durations Array of durations, sorted in ascending order.
   * @param {number} totalTime Total time (in ms) of interval containing durations.
   * @param {!Array<number>} percentiles Array of percentiles of interest, in ascending order.
   * @param {number=} clippedLength Optional length clipped from a duration overlapping end of window. Default of 0.
   * @return {!Array<{percentile: number, time: number}>}
   * @private
   */
  static _riskPercentiles(durations, totalTime, percentiles, clippedLength = 0) {
    let busyTime = 0;
    for (let i = 0; i < durations.length; i++) {
      busyTime += durations[i];
    }
    busyTime -= clippedLength;

    // Start with idle time already complete.
    let completedTime = totalTime - busyTime;
    let duration = 0;
    let cdfTime = completedTime;
    const results = [];

    let durationIndex = -1;
    let remainingCount = durations.length + 1;
    if (clippedLength > 0) {
      // If there was a clipped duration, one less in count since one hasn't started yet.
      remainingCount--;
    }

    // Find percentiles of interest, in order.
    for (const percentile of percentiles) {
      // Loop over durations, calculating a CDF value for each until it is above
      // the target percentile.
      const percentileTime = percentile * totalTime;
      while (cdfTime < percentileTime && durationIndex < durations.length - 1) {
        completedTime += duration;
        remainingCount -= (duration < 0 ? -1 : 1);

        if (clippedLength > 0 && clippedLength < durations[durationIndex + 1]) {
          duration = -clippedLength;
          clippedLength = 0;
        } else {
          durationIndex++;
          duration = durations[durationIndex];
        }

        // Calculate value of CDF (multiplied by totalTime) for the end of this duration.
        cdfTime = completedTime + Math.abs(duration) * remainingCount;
      }

      // Negative results are within idle time (0ms wait by definition), so clamp at zero.
      results.push({
        percentile,
        time: Math.max(0, (percentileTime - completedTime) / remainingCount) + BASE_RESPONSE_LATENCY
      });
    }

    return results;
  }

  /**
   * Calculates the maximum queueing time (in ms) of high priority tasks for
   * selected percentiles within a window of the main thread.
   * @see https://docs.google.com/document/d/1b9slyaB9yho91YTOkAQfpCdULFkZM9LqsipcX3t7He8/preview
   * @param {!TraceOfTabArtifact} tabTrace
   * @param {number=} startTime Optional start time (in ms relative to navstart) of range of interest. Defaults to navstart.
   * @param {number=} endTime Optional end time (in ms relative to navstart) of range of interest. Defaults to trace end.
   * @param {!Array<number>=} percentiles Optional array of percentiles to compute. Defaults to [0.5, 0.75, 0.9, 0.99, 1].
   * @return {!Array<{percentile: number, time: number}>}
   */
  static getRiskToResponsiveness(
    tabTrace,
    startTime = 0,
    endTime = tabTrace.timings.traceEnd,
    percentiles = [0.5, 0.75, 0.9, 0.99, 1]
  ) {
    const totalTime = endTime - startTime;
    percentiles.sort((a, b) => a - b);

    const ret = TraceProcessor.getMainThreadTopLevelEventDurations(tabTrace, startTime, endTime);
    return TraceProcessor._riskPercentiles(ret.durations, totalTime, percentiles,
        ret.clippedLength);
  }

  /**
   * Provides durations in ms of all main thread top-level events
   * @param {!TraceOfTabArtifact} tabTrace
   * @param {number} startTime Optional start time (in ms relative to navstart) of range of interest. Defaults to navstart.
   * @param {number} endTime Optional end time (in ms relative to navstart) of range of interest. Defaults to trace end.
   * @return {{durations: !Array<number>, clippedLength: number}}
   */
  static getMainThreadTopLevelEventDurations(tabTrace, startTime = 0, endTime = Infinity) {
    const topLevelEvents = TraceProcessor.getMainThreadTopLevelEvents(tabTrace, startTime, endTime);

    // Find durations of all slices in range of interest.
    const durations = [];
    let clippedLength = 0;

    topLevelEvents.forEach(event => {
      let duration = event.duration;
      let eventStart = event.start;
      if (eventStart < startTime) {
        // Any part of task before window can be discarded.
        eventStart = startTime;
        duration = event.end - startTime;
      }

      if (event.end > endTime) {
        // Any part of task after window must be clipped but accounted for.
        clippedLength = duration - (endTime - eventStart);
      }

      durations.push(duration);
    });
    durations.sort((a, b) => a - b);

    return {
      durations,
      clippedLength
    };
  }

  /**
   * Provides the top level events on the main thread with timestamps in ms relative to navigation
   * start.
   * @param {!TraceOfTabArtifact} tabTrace
   * @param {number=} startTime Optional start time (in ms relative to navstart) of range of interest. Defaults to navstart.
   * @param {number=} endTime Optional end time (in ms relative to navstart) of range of interest. Defaults to trace end.
   * @return {!Array<{start: number, end: number, duration: number}>}
   */
  static getMainThreadTopLevelEvents(tabTrace, startTime = 0, endTime = Infinity) {
    const topLevelEvents = [];
    // note: mainThreadEvents is already sorted by event start
    for (const event of tabTrace.mainThreadEvents) {
      if (event.name !== SCHEDULABLE_TASK_TITLE || !event.dur) continue;

      const start = (event.ts - tabTrace.navigationStartEvt.ts) / 1000;
      const end = (event.ts + event.dur - tabTrace.navigationStartEvt.ts) / 1000;
      if (start > endTime || end < startTime) continue;

      topLevelEvents.push({
        start,
        end,
        duration: event.dur / 1000,
      });
    }
    return topLevelEvents;
  }

  /**
   * Uses traceviewer's statistics package to create a log-normal distribution.
   * Specified by providing the median value, at which the score will be 0.5,
   * and the falloff, the initial point of diminishing returns where any
   * improvement in value will yield increasingly smaller gains in score. Both
   * values should be in the same units (e.g. milliseconds). See
   *   https://www.desmos.com/calculator/tx1wcjk8ch
   * for an interactive view of the relationship between these parameters and
   * the typical parameterization (location and shape) of the log-normal
   * distribution.
   * @param {number} median
   * @param {number} falloff
   * @return {!Statistics.LogNormalDistribution}
   */
  static getLogNormalDistribution(median, falloff) {
    const location = Math.log(median);

    // The "falloff" value specified the location of the smaller of the positive
    // roots of the third derivative of the log-normal CDF. Calculate the shape
    // parameter in terms of that value and the median.
    const logRatio = Math.log(falloff / median);
    const shape = 0.5 * Math.sqrt(1 - 3 * logRatio -
        Math.sqrt((logRatio - 3) * (logRatio - 3) - 8));

    return new traceviewer.b.Statistics.LogNormalDistribution(location, shape);
  }
}

module.exports = TraceProcessor;
