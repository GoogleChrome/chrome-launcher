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

const Audit = require('../../audits/estimated-input-latency.js');
const GatherRunner = require('../../gather/gather-runner.js');
const assert = require('assert');

const pwaTrace = require('../fixtures/traces/progressive-app.json');

const computedArtifacts = GatherRunner.instantiateComputedArtifacts();

function generateArtifactsWithTrace(trace) {
  return Object.assign({
    traces: {
      [Audit.DEFAULT_PASS]: trace
    }
  }, computedArtifacts);
}
/* eslint-env mocha */

describe('Performance: estimated-input-latency audit', () => {
  it('evaluates valid input correctly', () => {
    const artifacts = generateArtifactsWithTrace({traceEvents: pwaTrace});
    return Audit.audit(artifacts).then(output => {
      assert.equal(output.debugString, undefined);
      assert.equal(output.rawValue, 16.7);
      assert.equal(output.displayValue, '16.7ms');
      assert.equal(output.score, 100);
    });
  });
});
