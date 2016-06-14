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

class EstimatedInputLatency extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'estimated-input-latency',
      description: 'Estimated Input Latency',
      optimalValue: '50ms',
      requiredArtifacts: ['traceContents', 'Speedline']
    };
  }

  /**
   * Audits the page to estimate input latency.
   * @see https://github.com/GoogleChrome/lighthouse/issues/28
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @return {!AuditResult} The score from the audit, ranging from 0-100.
   */
  static audit(artifacts) {
    try {
      // Use speedline's first paint as start of range for input readiness check.
      const startTime = artifacts.Speedline.first;

      const trace = artifacts.traceContents;
      const tracingProcessor = new TracingProcessor();
      const model = tracingProcessor.init(artifacts.traceContents);
      const readiness = TracingProcessor.getRiskToResponsiveness(model, trace, startTime);

      const median = readiness.find(result => result.percentile === 0.5);
      const rawValue = median.time.toFixed(1) + 'ms';

      return EstimatedInputLatency.generateAuditResult({
        value: 0,
        optimalValue: this.meta.optimalValue,
        rawValue,
        extendedInfo: {
          value: readiness,
          formatter: Formatter.SUPPORTED_FORMATS.ESTIMATED_INPUT_LATENCY
        }
      });
    } catch (err) {
      return EstimatedInputLatency.generateAuditResult({
        value: -1,
        debugString: 'Unable to parse trace contents: ' + err.message
      });
    }
  }
}

module.exports = EstimatedInputLatency;
