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
const TracingProcessor = require('../../lib/traces/tracing-processor');

class InputReadinessMetric extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'input-readiness',
      description: 'Input readiness - main thread availability',
      optimalValue: '100',  // SCORING_POINT_OF_DIMINISHING_RETURNS.toLocaleString()
      requiredArtifacts: ['traceContents']
    };
  }

  /**
   * Audits the page to give a score for Input Readiness.
   * @see https://github.com/GoogleChrome/lighthouse/issues/26
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @return {!AuditResult} The score from the audit, ranging from 0-100.
   */
  static audit(artifacts) {
    try {
      const tracingProcessor = new TracingProcessor();
      const model = tracingProcessor.init(artifacts.traceContents);
      const hazardMetric = tracingProcessor.getInputReadiness(model);

      const readinessScore = Math.round(100 - (hazardMetric.numeric.value * 100));
      const rawValue = hazardMetric.numeric.value.toFixed(4);

      return InputReadinessMetric.generateAuditResult({
        value: readinessScore,
        rawValue: rawValue,
        optimalValue: this.meta.optimalValue
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
