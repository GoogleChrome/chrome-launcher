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

const Audit = require('../audit');

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

class InputReadinessMetric extends Audit {
  /**
   * @override
   */
  static get category() {
    return 'Performance';
  }

  /**
   * @override
   */
  static get name() {
    return 'input-readiness';
  }

  /**
   * @override
   */
  static get description() {
    return 'Input Readiness';
  }

  /**
   * @override
   */
  static get optimalValue() {
    return '100';
  }

  /**
   * Audits the page to give a score for Input Readiness.
   * @see https://github.com/GoogleChrome/lighthouse/issues/26
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @return {!AuditResult} The score from the audit, ranging from 0-100.
   */
  static audit(artifacts) {
    try {
      // Create the importer and import the trace contents to a model.
      const io = new traceviewer.importer.ImportOptions();
      io.showImportWarnings = false;
      io.shiftWorldToZero = true;
      io.pruneEmptyContainers = false;

      const events = [JSON.stringify({
        traceEvents: artifacts.traceContents
      })];
      const model = new traceviewer.Model();
      const importer = new traceviewer.importer.Import(model, io);
      importer.importTraces(events);

      // Now set up the user expectations model.
      // TODO(paullewis) confirm these values are meaningful.
      const idle = new traceviewer.model.um.IdleExpectation(model, 'test', 0, 10000);
      model.userModel.expectations.push(idle);

      // Set up a value list for the hazard metric.
      const valueList = new traceviewer.metrics.ValueList();
      traceviewer.metrics.sh.hazardMetric(valueList, model);
      const values = valueList.valueDicts[0];
      const readinessScore = 100 - (values.numeric.value * 100);

      return InputReadinessMetric.generateAuditResult({
        value: Math.round(readinessScore),
        rawValue: values.numeric.value.toFixed(4),
        optimalValue: this.optimalValue
      });
    } catch (err) {
      return InputReadinessMetric.generateAuditResult({
        value: -1,
        debugString: 'Unable to parse trace contents: ' + err.message
      });
    }
  }
}

module.exports = InputReadinessMetric;
