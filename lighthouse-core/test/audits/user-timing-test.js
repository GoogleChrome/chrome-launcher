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

const Audit = require('../../audits/user-timings.js');
const assert = require('assert');
const traceEvents = require('../fixtures/traces/trace-user-timings.json');

const GatherRunner = require('../../gather/gather-runner.js');
const computedArtifacts = GatherRunner.instantiateComputedArtifacts();

function generateArtifactsWithTrace(trace) {
  return Object.assign({
    traces: {
      [Audit.DEFAULT_PASS]: {traceEvents: Array.isArray(trace) ? trace : trace.traceEvents}
    }
  }, computedArtifacts);
}

/* eslint-env mocha */
describe('Performance: user-timings audit', () => {
  it('evaluates valid input correctly', () => {
    return Audit.audit(generateArtifactsWithTrace(traceEvents)).then(auditResult => {
      const blackListedUTs = auditResult.extendedInfo.value.filter(timing => {
        return Audit.blacklistedPrefixes.some(prefix => timing.name.startsWith(prefix));
      });
      assert.equal(blackListedUTs.length, 0, 'Blacklisted usertimings included in results');

      assert.equal(auditResult.rawValue, true);
      assert.equal(auditResult.displayValue, 2);

      assert.equal(auditResult.extendedInfo.value[0].isMark, true);
      assert.equal(Math.floor(auditResult.extendedInfo.value[0].startTime), 1000);
      assert.equal(typeof auditResult.extendedInfo.value[0].endTime, 'undefined');
      assert.equal(typeof auditResult.extendedInfo.value[0].duration, 'undefined');

      assert.equal(auditResult.extendedInfo.value[1].isMark, false);
      assert.equal(Math.floor(auditResult.extendedInfo.value[1].startTime), 0);
      assert.equal(Math.floor(auditResult.extendedInfo.value[1].endTime), 1000);
      assert.equal(Math.floor(auditResult.extendedInfo.value[1].duration), 1000);
    });
  });
});
