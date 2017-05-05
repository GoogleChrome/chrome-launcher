/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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

const FastPWAAudit = require('../../audits/load-fast-enough-for-pwa');
const TTIAudit = require('../../audits/time-to-interactive');
const Audit = require('../../audits/audit.js');
const assert = require('assert');

function generateTTIResults(ttiValue) {
  const ttiResult = {
    rawValue: ttiValue,
    extendedInfo: {
      value: {
        timings: {
          timeToInteractive: ttiValue
        }
      }
    }
  };
  return Promise.resolve.bind(Promise, ttiResult);
}

function generateArtifacts(networkRecords = []) {
  return {
    devtoolsLogs: {
      [Audit.DEFAULT_PASS]: []
    },
    requestNetworkRecords: () => {
      return Promise.resolve(networkRecords);
    },
    traces: {
      [Audit.DEFAULT_PASS]: {traceEvents: []}
    }
  };
}

/* eslint-env mocha */
describe('PWA: load-fast-enough-for-pwa audit', () => {
  // monkeypatch TTI to for a more focused test
  let origTTI;
  beforeEach(() => origTTI = TTIAudit.audit);
  afterEach(() => TTIAudit.audit = origTTI);

  it('returns boolean based on TTI value', () => {
    TTIAudit.audit = generateTTIResults(5000);
    return FastPWAAudit.audit(generateArtifacts()).then(result => {
      assert.equal(result.rawValue, true, 'fixture trace is not passing audit');
    });
  });

  it('fails a bad TTI value', () => {
    TTIAudit.audit = generateTTIResults(15000);
    return FastPWAAudit.audit(generateArtifacts()).then(result => {
      assert.equal(result.rawValue, false, 'not failing a long TTI value');
      assert.ok(result.debugString);
    });
  });

  it('fails a good TTI value with no throttling', () => {
    TTIAudit.audit = generateTTIResults(5000);
    // latencies are very short
    const mockNetworkRecords = [
      {_timing: {sendEnd: 0, receiveHeadersEnd: 50}},
      {_timing: {sendEnd: 0, receiveHeadersEnd: 75}},
      { },
      {_timing: {sendEnd: 0, receiveHeadersEnd: 50}},
    ];
    return FastPWAAudit.audit(generateArtifacts(mockNetworkRecords)).then(result => {
      assert.equal(result.rawValue, false);
      assert.ok(result.debugString.includes('network request latencies'));
    });
  });


  it('passes a good TTI value and WITH throttling', () => {
    TTIAudit.audit = generateTTIResults(5000);
    // latencies are very long
    const mockNetworkRecords = [
      {_timing: {sendEnd: 0, receiveHeadersEnd: 250}},
      {_timing: {sendEnd: 0, receiveHeadersEnd: 175}},
      { },
      {_timing: {sendEnd: 0, receiveHeadersEnd: 250}},
    ];
    return FastPWAAudit.audit(generateArtifacts(mockNetworkRecords)).then(result => {
      assert.equal(result.rawValue, true);
      assert.strictEqual(result.debugString, undefined);
    });
  });
});
