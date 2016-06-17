/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

if (typeof global.window === 'undefined') {
  global.window = global;
}

// we need gl-matrix and jszip for traceviewer
// since it has internal forks for isNode and they get mixed up during
// browserify, we require them locally here and global-ize them.

// from catapult/tracing/tracing/base/math.html
const glMatrixModule = require('gl-matrix');
Object.keys(glMatrixModule).forEach(exportName => {
  global[exportName] = glMatrixModule[exportName];
});
// from catapult/tracing/tracing/extras/importer/jszip.html
global.JSZip = require('jszip/dist/jszip.min.js');

global.HTMLImportsLoader = {};
global.HTMLImportsLoader.hrefToAbsolutePath = function(path) {
  if (path === '/gl-matrix-min.js') {
    return 'empty-module';
  }
  if (path === '/jszip.min.js') {
    return 'jszip/dist/jszip.min.js';
  }
};

require('../../third_party/traceviewer-js/');
const traceviewer = global.tr;

class TraceProcessor {
  get RESPONSE() {
    return 'Response';
  }

  get ANIMATION() {
    return 'Animation';
  }

  get LOAD() {
    return 'Load';
  }

  init(contents) {
    let contentsJSON = null;

    try {
      contentsJSON = typeof contents === 'string' ? JSON.parse(contents) :
          contents;

      // If the file already wrapped the trace events in a
      // traceEvents object, grab the contents of the object.
      if (contentsJSON !== null &&
        typeof contentsJSON.traceEvents !== 'undefined') {
        contentsJSON = contentsJSON.traceEvents;
      }
    } catch (e) {
      throw new Error('Invalid trace contents: ' + e.message);
    }

    const events = [JSON.stringify({
      traceEvents: contentsJSON
    })];

    return this.convertEventsToModel(events);
  }

  // Create the importer and import the trace contents to a model.
  convertEventsToModel(events) {
    const io = new traceviewer.importer.ImportOptions();
    io.showImportWarnings = false;
    io.pruneEmptyContainers = false;
    io.shiftWorldToZero = true;

    const model = new traceviewer.Model();
    const importer = new traceviewer.importer.Import(model, io);
    importer.importTraces(events);

    return model;
  }

  /**
   * Find a main thread from supplied model with matching processId and
   * threadId.
   * @param {!Object} model TraceProcessor Model
   * @param {number} processId
   * @param {number} threadId
   * @return {!Object}
   * @private
   */
  static _findMainThreadFromIds(model, processId, threadId) {
    const modelHelper = model.getOrCreateHelper(traceviewer.model.helpers.ChromeModelHelper);
    const renderHelpers = traceviewer.b.dictionaryValues(modelHelper.rendererHelpers);
    const mainThread = renderHelpers.find(helper => {
      return helper.mainThread &&
        helper.pid === processId &&
        helper.mainThread.tid === threadId;
    }).mainThread;

    return mainThread;
  }

  /**
   * Calculate duration at specified percentiles for given population of
   * durations.
   * @param {!Array<number>} durations Array of durations, sorted in ascending order.
   * @param {number} totalTime Total time (in ms) of interval containing durations.
   * @param {!Array<number>} percentiles Array of percentiles of interest, in ascending order.
   * @return {!Array<{percentile: number, time: number}>}
   * @private
   */
  static _riskPercentiles(durations, totalTime, percentiles) {
    let busyTime = 0;
    for (let i = 0; i < durations.length; i++) {
      busyTime += durations[i];
    }

    // Start with idle time already complete.
    let completedTime = totalTime - busyTime;
    let duration = 0;
    let cdfTime = completedTime;
    let remainingCount = durations.length + 1;
    const results = [];

    // Find percentiles of interest, in order.
    for (let percentile of percentiles) {
      // Loop over durations, calculating a CDF value for each until it is above
      // the target percentile.
      const percentileTime = percentile * totalTime;
      while (cdfTime < percentileTime && remainingCount > 1) {
        completedTime += duration;
        remainingCount--;
        duration = durations[durations.length - remainingCount];

        // Calculate value of CDF (multiplied by totalTime) for the end of this duration.
        cdfTime = completedTime + duration * remainingCount;
      }

      // Negative results are within idle time (0ms wait by definition), so clamp at zero.
      results.push({
        percentile,
        time: Math.max(0, (percentileTime - completedTime) / remainingCount)
      });
    }

    return results;
  }

  /**
   * Calculates the maximum queueing time (in ms) of high priority tasks for
   * selected percentiles within a window of the main thread.
   * @param {!Array<!Object>} trace
   * @param {number=} startTime Optional start time (in ms) of range of interest. Defaults to trace start.
   * @param {number=} endTime Optional end time (in ms) of range of interest. Defaults to trace end.
   * @return {!Array<{percentile: number, time: number}>}
   */
  static getRiskToResponsiveness(model, trace, startTime, endTime) {
    // Range of responsiveness we care about. Default to bounds of model.
    startTime = startTime === undefined ? model.bounds.min : startTime;
    endTime = endTime === undefined ? model.bounds.max : endTime;
    const totalTime = endTime - startTime;

    // Find the main thread.
    const startEvent = trace.find(event => {
      return event.name === 'TracingStartedInPage';
    });
    const mainThread = TraceProcessor._findMainThreadFromIds(model, startEvent.pid, startEvent.tid);

    // Find durations of all slices in range of interest.
    // TODO(bckenny): filter for top level slices ourselves?
    const durations = [];
    mainThread.sliceGroup.topLevelSlices.forEach(slice => {
      // Discard slices outside range.
      if (slice.end <= startTime || slice.start >= endTime) {
        return;
      }

      durations.push(slice.duration);
    });
    durations.sort((a, b) => a - b);

    const percentiles = [0.5, 0.75, 0.9, 0.99, 1];
    return TraceProcessor._riskPercentiles(durations, totalTime, percentiles);
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
