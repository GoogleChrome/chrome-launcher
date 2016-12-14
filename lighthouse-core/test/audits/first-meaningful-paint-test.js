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

const FMPAudit = require('../../audits/first-meaningful-paint.js');
const Audit = require('../../audits/audit.js');
const assert = require('assert');
const traceEvents = require('../fixtures/traces/progressive-app.json');
const badNavStartTrace = require('../fixtures/traces/bad-nav-start-ts.json');
const lateTracingStartedTrace = require('../fixtures/traces/tracingstarted-after-navstart.json');

function getArtifacts(trace) {
  return {
    traces: {
      [Audit.DEFAULT_PASS]: {traceEvents: Array.isArray(trace) ? trace : trace.traceEvents}
    }
  };
}

/* eslint-env mocha */
describe('Performance: first-meaningful-paint audit', () => {
  describe('measures the pwa.rocks example correctly', () => {
    let fmpResult;

    it('processes a valid trace file', () => {
      return FMPAudit.audit(getArtifacts(traceEvents)).then(result => {
        fmpResult = result;
      }).catch(_ => {
        assert.ok(false);
      });
    });

    it('finds the expected fMP', () => {
      assert.equal(fmpResult.displayValue, '1099.5ms');
      assert.equal(fmpResult.rawValue, 1099.5);
    });

    it('finds the correct fMP timings', () => {
      assert.equal(fmpResult.extendedInfo.value.timings.fMP, 1099.523);
    });

    it('exposes the FCP timing', () => {
      assert.equal(fmpResult.extendedInfo.value.timings.fCP, 461.901);
    });

    it('exposes the navStart timestamp', () => {
      assert.equal(fmpResult.extendedInfo.value.timestamps.navStart, 668545382727);
    });

    it('scores the fMP correctly', () => {
      assert.equal(fmpResult.score, 99);
    });
  });

  describe('finds correct FMP in various traces', () => {
    it('finds the fMP if there was a tracingStartedInPage after the frame\'s navStart', () => {
      return FMPAudit.audit(getArtifacts(lateTracingStartedTrace)).then(result => {
        assert.equal(result.displayValue, '529.9ms');
        assert.equal(result.rawValue, 529.9);
        assert.equal(result.extendedInfo.value.timestamps.navStart, 29343540951);
        assert.equal(result.extendedInfo.value.timings.fCP, 80.054);
        assert.ok(!result.debugString);
      }).catch(_ => {
        console.error(_);
        assert.ok(false);
      });
    });

    it('finds the fMP if there was a tracingStartedInPage after the frame\'s navStart #2', () => {
      return FMPAudit.audit(getArtifacts(badNavStartTrace)).then(result => {
        assert.equal(result.displayValue, '632.4ms');
        assert.equal(result.rawValue, 632.4);
        assert.equal(result.extendedInfo.value.timestamps.navStart, 8885424467);
        assert.equal(result.extendedInfo.value.timings.fCP, 632.419);
        assert.ok(!result.debugString);
      }).catch(_ => {
        assert.ok(false);
      });
    });
  });
});
