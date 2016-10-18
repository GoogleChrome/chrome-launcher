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

/* eslint-env mocha */
describe('Performance: first-meaningful-paint audit', () => {
  it('scores a -1 when no trace data is present', () => {
    return FMPAudit.audit({}).then(result => {
      assert.equal(result.score, -1);
      assert.ok(result.debugString);
    });
  });

  it('scores a -1 when faulty trace data is present', () => {
    const artifacts = {
      traces: {
        [Audit.DEFAULT_PASS]: {boo: 'ya'}
      }
    };
    return FMPAudit.audit(artifacts).then(result => {
      assert.equal(result.rawValue, -1);
      assert.ok(result.debugString);
    });
  });

  it('scores a -1 and returns an error when navigation start is before trace start', () => {
    const artifacts = {
      traces: {
        [Audit.DEFAULT_PASS]: badNavStartTrace
      }
    };
    return FMPAudit.audit(artifacts).then(result => {
      assert.equal(result.rawValue, -1);
      assert.ok(/navigationStart/.test(result.debugString));
    });
  });

  describe('measures the pwa.rocks example correctly', () => {
    let fmpResult;

    it('processes a valid trace file', () => {
      const artifacts = {
        traces: {
          [Audit.DEFAULT_PASS]: {traceEvents}
        }
      };

      return FMPAudit.audit(artifacts).then(result => {
        fmpResult = result;
      }).catch(_ => {
        assert.ok(false);
      });
    });

    it('finds the expected fMP', () => {
      assert.equal(fmpResult.displayValue, '1099.5ms');
      assert.equal(fmpResult.rawValue, 1099.5);
    });

    it('finds the correct fCP + fMP timings', () => {
      assert.equal(fmpResult.extendedInfo.value.timings.fCP, 461.901);
      assert.equal(fmpResult.extendedInfo.value.timings.fMPbasic, 461.342);
      assert.equal(fmpResult.extendedInfo.value.timings.fMPpageheight, 461.342);
      assert.equal(fmpResult.extendedInfo.value.timings.fMPwebfont, 1099.523);
      assert.equal(fmpResult.extendedInfo.value.timings.fMPfull, 1099.523);
    });

    it('scores the fMP correctly', () => {
      assert.equal(fmpResult.score, 99);
    });
  });
});
