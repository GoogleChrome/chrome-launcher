/**
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

const TimeToInteractive = require('../../audits/time-to-interactive.js');
const GatherRunner = require('../../gather/gather-runner.js');
const assert = require('assert');

const pwaTrace = require('../fixtures/traces/progressive-app.json');

/* eslint-env mocha */
describe('Performance: time-to-interactive audit', () => {
  it('evaluates valid input correctly', () => {
    const artifacts = Object.assign({
      traces: {
        [TimeToInteractive.DEFAULT_PASS]: {
          traceEvents: pwaTrace
        }
      }
    }, GatherRunner.instantiateComputedArtifacts());

    return TimeToInteractive.audit(artifacts).then(output => {
      assert.equal(output.rawValue, 1105.8, output.debugString);
      assert.equal(output.displayValue, '1105.8ms');
      assert.equal(output.extendedInfo.value.expectedLatencyAtTTI, 20.724);
      assert.equal(output.extendedInfo.value.timings.fMP, 1099.523);
      assert.equal(output.extendedInfo.value.timings.timeToInteractive, 1105.798);
      assert.equal(output.extendedInfo.value.timings.visuallyReady, 1105.798);
    });
  });
});
