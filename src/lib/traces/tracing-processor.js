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

require('../../../third_party/traceviewer-js/');
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

  getInputReadiness(model) {
    // Now set up the user expectations model.
    // this fake idle Interaction Record is used to grab the readiness out of
    // TODO(paullewis) start the idle at firstPaint/fCP and end it at end of recording
    const idle = new traceviewer.model.um.IdleExpectation(model, 'test', 0, 10000);
    model.userModel.expectations.push(idle);

    // Set up a value list for the hazard metric.
    // TODO use new approach from ben
    //   https://github.com/GoogleChrome/lighthouse/pull/284#issuecomment-217263964
    const valueList = new traceviewer.metrics.ValueList();
    traceviewer.metrics.sh.hazardMetric(valueList, model);
    // grab last item, as it matches the fake idle we push()'d into the model'
    const metricValue = valueList.valueDicts[valueList.valueDicts.length - 1];
    return metricValue;
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
