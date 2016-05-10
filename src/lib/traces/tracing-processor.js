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
const URL = require('url');

/* global window */
window.global = window;

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

  analyzeTrace(contents, opts) {
    this.model = this.init(contents);

    const processes = this.model.getAllProcesses();
    let summarizable = [];
    let traceProcess = null;

    processes.forEach(candidate => {
      if (typeof candidate.labels !== 'undefined' &&
          candidate.labels.length > 0 &&
          candidate.labels[0] !== 'chrome://tracing' &&
          candidate.labels[0] !== 'BackgroundPage') {
        summarizable.push(candidate);
      }

      if (typeof candidate.labels !== 'undefined' &&
          candidate.labels[0] === 'BackgroundPage') {
        const error = 'Extensions running during capture; ' +
                    'see http://bit.ly/bigrig-extensions';
        if (typeof opts !== 'undefined' && opts.strict) {
          throw error;
        }
      }
    });

    if (summarizable.length === 0) {
      throw new Error('Zero processes (tabs) found.');
    }

    if (summarizable.length > 1) {
      summarizable = summarizable
          .filter(pr => !!pr.labels[0])
          .slice(-1);
    }

    traceProcess = summarizable.pop();
    return this.processTrace(this.model, traceProcess, opts);
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
    // TODO(paullewis) confirm these values are meaningful.
    const idle = new traceviewer.model.um.IdleExpectation(model, 'test', 0, 10000);
    model.userModel.expectations.push(idle);

    // Set up a value list for the hazard metric.
    // TODO use new approach from ben
    //   https://github.com/GoogleChrome/lighthouse/pull/284#issuecomment-217263964
    const valueList = new traceviewer.metrics.ValueList();
    traceviewer.metrics.sh.hazardMetric(valueList, model);
    const metricValue = valueList.valueDicts[0];
    return metricValue;
  }

  processTrace(model, traceProcess, opts) {
    const threads = this.getThreads(traceProcess);
    const rendererThread = this.getThreadByName(traceProcess, 'CrRendererMain');

    if (!rendererThread) {
      throw new Error('Can\'t find renderer thread');
    }

    let timeRanges = this.getTimeRanges(rendererThread);

    if (timeRanges.length === 0) {
      timeRanges = [{
        title: this.LOAD,
        start: model.bounds.min,
        duration: (model.bounds.max - model.bounds.min)
      }];
    }

    return this.createRangesForTrace(timeRanges, threads, opts);
  }

  createRangesForTrace(timeRanges, threads, opts) {
    const results = [];
    const baseTypes = {
      Load: this.LOAD
    };

    if (typeof opts === 'undefined') {
      opts = {
        types: baseTypes
      };
    }

    if (typeof opts.types === 'undefined') {
      opts.types = baseTypes;
    }

    /* eslint-disable */
    // Disable linting because eslint can't differentiate JSON from non-JSON
    // @see https://github.com/eslint/eslint/issues/3484

    timeRanges.forEach(timeRange => {
      let frames = 0;
      const timeRangeEnd = timeRange.start + timeRange.duration;
      const result = {
        "start": timeRange.start,
        "end": timeRangeEnd,
        "duration": timeRange.duration,
        "parseHTML": 0,
        "javaScript": 0,
        "javaScriptCompile": 0,
        "styles": 0,
        "updateLayerTree": 0,
        "layout": 0,
        "paint": 0,
        "raster": 0,
        "composite": 0,
        "extendedInfo": {
          "domContentLoaded": 0,
          "loadTime": 0,
          "firstPaint": 0,
          "javaScript": {

          }
        },
        "title": timeRange.title,
        "type": opts.types[timeRange.title]
      };

      /* eslint-enable */

      threads.forEach(thread => {
        const slices = thread.sliceGroup.topLevelSlices;
        let slice = null;

        for (let s = 0; s < slices.length; s++) {
          slice = slices[s];

          if (slice.start < timeRange.start || slice.end > timeRangeEnd) {
            continue;
          }

          slice.iterateAllDescendents(subslice => {
            this.addDurationToResult(subslice, result);
          });
        }

        thread.iterateAllEvents(evt => {
          if (evt.start < timeRange.start || evt.end > timeRangeEnd) {
            return;
          }

          switch (evt.title) {

            case 'DrawFrame':
              frames++;
              break;

            case 'MarkDOMContent':
              result.extendedInfo.domContentLoaded = evt.start;
              break;

            case 'MarkLoad':
              result.extendedInfo.loadTime = evt.start;
              break;

            case 'MarkFirstPaint':
              result.extendedInfo.firstPaint = evt.start;
              break;

            default:
              // Ignore
              break;
          }
        });
      });

      if (typeof result.type === 'undefined') {
        if (timeRange.title === this.LOAD) {
          result.type = this.LOAD;
        } else if (frames > 5) {
          result.type = this.ANIMATION;
        } else {
          result.type = this.RESPONSE;
        }
      }

      // Convert to fps.
      if (result.type === this.ANIMATION) {
        result.fps = Math.floor(frames / (result.duration / 1000));
        result.frameCount = frames;
      }

      results.push(result);
    });

    return results;
  }

  hasStackInfo(slice) {
    return slice.args &&
        slice.args.beginData &&
        slice.args.beginData.stackTrace &&
        slice.args.beginData.stackTrace.length;
  }

  getJavascriptUrlFromStackInfo(slice) {
    let url = null;

    if (typeof slice.args.data === 'undefined') {
      return url;
    }

    // Check for the URL in the slice.
    // Failing that, look for scriptName.
    if (typeof slice.args.data.url !== 'undefined' &&
        slice.args.data.url !== '' &&
        /^http/.test(slice.args.data.url)) {
      url = slice.args.data.url;
    } else if (typeof slice.args.data.scriptName !== 'undefined' &&
        slice.args.data.scriptName !== '' &&
        /^http/.test(slice.args.data.scriptName)) {
      url = slice.args.data.scriptName;
    }

    return url;
  }

  addDurationToResult(slice, result) {
    const duration = this.getBestDurationForSlice(slice);
    let hasStack;
    let owner;

    switch (slice.title) {
      case 'ParseHTML':
        result.parseHTML += duration;
        break;

      case 'FunctionCall':
      case 'EvaluateScript':
      case 'V8.Execute':
      case 'MajorGC':
      case 'MinorGC':
      case 'GCEvent':
        result.javaScript += duration;

        // If we have JS Stacks find out who the culprits are for the
        // JavaScript that is running.
        owner = this.getJavascriptUrlFromStackInfo(slice);

        if (owner !== null) {
          const url = URL.parse(owner);
          const host = url.host;

          if (!result.extendedInfo.javaScript[host]) {
            result.extendedInfo.javaScript[host] = 0;
          }

          result.extendedInfo.javaScript[host] += duration;
        }
        break;

      case 'v8.compile':
        result.javaScriptCompile += duration;
        break;

      case 'UpdateLayoutTree':
      case 'RecalculateStyles':
      case 'ParseAuthorStyleSheet':
        result.styles += duration;

        // If there's a stack trace then this has been forced.
        hasStack = this.hasStackInfo(slice);

        if (hasStack) {
          if (typeof result.extendedInfo.forcedRecalcs === 'undefined') {
            result.extendedInfo.forcedRecalcs = 0;
          }

          result.extendedInfo.forcedRecalcs++;
        }
        break;

      case 'UpdateLayerTree':
        result.updateLayerTree += duration;
        break;

      case 'Layout':
        result.layout += duration;

        // If there's a stack trace then this has been forced.
        hasStack = this.hasStackInfo(slice);

        if (hasStack) {
          if (typeof result.extendedInfo.forcedLayouts === 'undefined') {
            result.extendedInfo.forcedLayouts = 0;
          }

          result.extendedInfo.forcedLayouts++;
        }
        break;

      case 'Paint':
        result.paint += duration;
        break;

      case 'RasterTask':
      case 'Rasterize':
        result.raster += duration;
        break;

      case 'CompositeLayers':
        result.composite += duration;
        break;

      default:
        // Disregard unknown types.
        break;
    }
  }

  getBestDurationForSlice(slice) {
    let duration = 0;

    if (typeof slice.cpuSelfTime !== 'undefined') {
      duration = slice.cpuSelfTime;
    } else if (typeof slice.cpuDuration !== 'undefined') {
      duration = slice.cpuDuration;
    } else if (typeof slice.duration !== 'undefined') {
      duration = slice.duration;
    }

    return duration;
  }

  getThreads(traceProcess) {
    const threadKeys = Object.keys(traceProcess.threads);
    const threads = [];

    threadKeys.forEach(threadKey => {
      const thread = traceProcess.threads[threadKey];

      if (typeof thread.name === 'undefined') {
        return;
      }

      if (thread.name === 'Compositor' ||
          thread.name === 'CrRendererMain' ||
          thread.name.indexOf('CompositorTileWorker') >= 0) {
        threads.push(thread);
      }
    });

    return threads;
  }

  getThreadByName(traceProcess, name) {
    const threadKeys = Object.keys(traceProcess.threads);
    let threadKey = null;
    let thread = null;

    for (let t = 0; t < threadKeys.length; t++) {
      threadKey = threadKeys[t];
      thread = traceProcess.threads[threadKey];

      if (thread.name === name) {
        return thread;
      }
    }

    return null;
  }

  getTimeRanges(thread) {
    const timeRanges = [];

    thread.iterateAllEvents(evt => {
      if (evt.category === 'blink.console' && typeof evt.start === 'number') {
        timeRanges.push(evt);
      }
    });

    return timeRanges;
  }
}

module.exports = new TraceProcessor();
