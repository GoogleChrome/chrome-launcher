/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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

/* global tr */

var URL = require('url');
var RESPONSE = 'Response';
var ANIMATION = 'Animation';
var LOAD = 'Load';

// Does a bunch on the global object, because the code for trace viewer
// currently operates on `window`, and the conversion doesn't account for
// requires and modules.
var globalConfig = require('./global-config.js');

function analyzeTrace (contents, opts) {

  var contentsJSON = null;

  try {
    contentsJSON = JSON.parse(contents);

    // If the file already wrapped the trace events in a
    // traceEvents object, grab the contents of the object.
    if (contentsJSON !== null &&
      typeof contentsJSON.traceEvents !== 'undefined') {
      contentsJSON = contentsJSON.traceEvents;
    }

  } catch (e) {
    throw 'Invalid trace contents; not JSON';
  }

  var events = [JSON.stringify({
    traceEvents: contentsJSON
  })];

  // Switch on all the globals we need, and import tracing.
  globalConfig.enable();

  var model = convertEventsToModel(events);
  var processes = model.getAllProcesses();
  var traceProcess = null;
  var summarizable = [];

  for (var p = 0; p < processes.length; p++) {
    var candidate = processes[p];

    if (typeof candidate.labels !== 'undefined' &&
        candidate.labels.length > 0 &&
        candidate.labels[0] !== 'chrome://tracing' &&
        candidate.labels[0] !== 'BackgroundPage') {
      summarizable.push(candidate);
    }

    if (typeof candidate.labels !== 'undefined' &&
        candidate.labels[0] === 'BackgroundPage') {

      var error = 'Extensions running during capture; ' +
                  'see http://bit.ly/bigrig-extensions';
      if (typeof opts !== 'undefined' && opts.strict) {
        throw error;
      }
    }
  }

  if (summarizable.length === 0) {
    throw 'Zero processes (tabs) found.';
  }

  if (summarizable.length > 1) {
    var bullet = '\n  * ';
    var tabs = summarizable
        .map(pr => pr.labels[0])
        .map(l => l.trim()).join(bullet);

    console.warn('Multiple processes (tabs) found:' + bullet, tabs);

    summarizable = summarizable
        .filter(pr => !!pr.labels[0])
        .slice(-1);

    console.log('\nProceeding using the last named tab:' + bullet,
        summarizable[0].labels[0]);
  }

  traceProcess = summarizable.pop();
  // Reset all the globals we had to define for window etc.
  globalConfig.disable();
  return processTrace(model, traceProcess, opts);
}

function convertEventsToModel (events) {

  require('./third_party/tracing/importer/import.js');
  require('./third_party/tracing/extras/importer/trace_event_importer.js');
  require('./third_party/tracing/extras/rail/rail_score.js');
  require('./third_party/tracing/extras/rail/rail_ir_finder.js');
  require('./tracing-config.js');

  var io = new tr.importer.ImportOptions();
  io.showImportWarnings = false;
  io.shiftWorldToZero = true;
  io.pruneEmptyContainers = false;

  var model = new tr.Model();
  var importer = new tr.importer.Import(model, io);
  importer.importTraces(events);

  return model;
}

function processTrace (model, traceProcess, opts) {

  var threads = getThreads(traceProcess);
  var rendererThread = getThreadByName(traceProcess, 'CrRendererMain');

  if (!rendererThread) {
    throw 'Can\'t find renderer thread';
  }

  var timeRanges = getTimeRanges(rendererThread);

  if (timeRanges.length === 0) {
    timeRanges = [{
      title: LOAD,
      start: model.bounds.min,
      duration: (model.bounds.max - model.bounds.min)
    }];
  }

  return createRangesForTrace(timeRanges, threads, opts);
}

function createRangesForTrace (timeRanges, threads, opts) {


  var results = [];
  var baseTypes = {
    'Load': LOAD
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

  timeRanges.forEach(function(timeRange) {

    var frames = 0;
    var timeRangeEnd = timeRange.start + timeRange.duration;
    var result = {
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

    threads.forEach(function (thread) {

      var slices = thread.sliceGroup.topLevelSlices;
      var slice = null;

      for (var s = 0 ; s < slices.length; s++) {
        slice = slices[s];

        if (slice.start < timeRange.start || slice.end > timeRangeEnd) {
          continue;
        }

        slice.iterateAllDescendents(function (subslice) {
          addDurationToResult(subslice, result);
        });
      }


      thread.iterateAllEvents(function (evt) {

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
      if (timeRange.title === LOAD) {
        result.type = LOAD;
      } else if (frames > 5) {
        result.type = ANIMATION;
      } else {
        result.type = RESPONSE;
      }
    }

    // Convert to fps.
    if (result.type === ANIMATION) {
      result.fps = Math.floor(frames / (result.duration / 1000));
      result.frameCount = frames;
    }

    results.push(result);
  });

  return results;
}

function hasStackInfo (slice) {
  return slice.args &&
      slice.args.beginData &&
      slice.args.beginData.stackTrace &&
      slice.args.beginData.stackTrace.length;
}

function getJavascriptUrlFromStackInfo (slice) {
  var url = null;

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

function addDurationToResult (slice, result) {

  var duration = getBestDurationForSlice(slice);
  var hasStack;

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
      var owner = getJavascriptUrlFromStackInfo(slice);

      if (owner !== null) {
        var url = URL.parse(owner);
        var host = url.host;

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
      hasStack = hasStackInfo(slice);

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
      hasStack = hasStackInfo(slice);

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

function getBestDurationForSlice (slice) {

  var duration = 0;

  if (typeof slice.cpuSelfTime !== 'undefined') {
    duration = slice.cpuSelfTime;
  } else if (typeof slice.cpuDuration !== 'undefined') {
    duration = slice.cpuDuration;
  } else if (typeof slice.duration !== 'undefined') {
    duration = slice.duration;
  }

  return duration;
}

function getThreads (traceProcess) {

  var threadKeys = Object.keys(traceProcess.threads);
  var threadKey = null;
  var threads = [];
  var thread = null;

  for (var t = 0; t < threadKeys.length; t++) {
    threadKey = threadKeys[t];
    thread = traceProcess.threads[threadKey];

    if (typeof thread.name === 'undefined') {
      continue;
    }

    if (thread.name === 'Compositor' ||
        thread.name === 'CrRendererMain' ||
        thread.name.indexOf('CompositorTileWorker') >= 0) {
      threads.push(thread);
    }
  }

  return threads;
}

function getThreadByName (traceProcess, name) {

  var threadKeys = Object.keys(traceProcess.threads);
  var threadKey = null;
  var thread = null;

  for (var t = 0; t < threadKeys.length; t++) {
    threadKey = threadKeys[t];
    thread = traceProcess.threads[threadKey];

    if (thread.name === name) {
      return thread;
    }
  }

  return null;
}

function getTimeRanges (thread) {

  var timeRanges = [];
  thread.iterateAllEvents(function (evt) {
    if (evt.category === 'blink.console' && typeof evt.start === 'number') {
      timeRanges.push(evt);
    }
  });

  return timeRanges;
}

module.exports = {
  RESPONSE: RESPONSE,
  ANIMATION: ANIMATION,
  LOAD: LOAD,
  analyzeTrace: analyzeTrace
};
