/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FastPWAAudit = require('../../audits/load-fast-enough-for-pwa');
const Audit = require('../../audits/audit.js');
const assert = require('assert');

function generateArtifacts(firstInteractiveValue, networkRecords = []) {
  return {
    devtoolsLogs: {
      [Audit.DEFAULT_PASS]: []
    },
    requestNetworkRecords: () => {
      return Promise.resolve(networkRecords);
    },
    traces: {
      [Audit.DEFAULT_PASS]: {traceEvents: []}
    },
    requestFirstInteractive: () => Promise.resolve({
      timeInMs: firstInteractiveValue,
    }),
  };
}

/* eslint-env mocha */
describe('PWA: load-fast-enough-for-pwa audit', () => {
  it('returns boolean based on TTI value', () => {
    return FastPWAAudit.audit(generateArtifacts(5000)).then(result => {
      assert.equal(result.rawValue, true, 'fixture trace is not passing audit');
    });
  });

  it('fails a bad TTI value', () => {
    return FastPWAAudit.audit(generateArtifacts(15000)).then(result => {
      assert.equal(result.rawValue, false, 'not failing a long TTI value');
      assert.ok(result.debugString);
    });
  });

  it('warns on a good TTI value with no throttling', () => {
    // latencies are very short
    const mockNetworkRecords = [
      {_timing: {sendEnd: 0, receiveHeadersEnd: 50}, finished: true, _url: 'https://google.com/'},
      {_timing: {sendEnd: 0, receiveHeadersEnd: 75}, finished: true, _url: 'https://google.com/a'},
      { },
      {_timing: {sendEnd: 0, receiveHeadersEnd: 50}, finished: true, _url: 'https://google.com/b'},
    ];
    return FastPWAAudit.audit(generateArtifacts(5000, mockNetworkRecords)).then(result => {
      assert.equal(result.rawValue, true);
      assert.ok(result.debugString.includes('network request latencies'));
      assert.ok(result.details, 'contains details when latencies were not realistic');
    });
  });

  it('ignores resources coming from cache', () => {
    const mockNetworkRecords = [
      {_timing: {sendEnd: 0, receiveHeadersEnd: 50}, _fromDiskCache: true},
    ];
    return FastPWAAudit.audit(generateArtifacts(5000, mockNetworkRecords)).then(result => {
      assert.equal(result.rawValue, true);
      assert.strictEqual(result.debugString, undefined);
    });
  });

  it('passes a good TTI value and WITH throttling', () => {
    // latencies are very long
    const urlA = 'https://google.com';
    const urlB = 'https://example.com';
    const urlC = 'https://example-c.com';
    const mockNetworkRecords = [
      {_timing: {sendEnd: 0, receiveHeadersEnd: 250}, finished: true, _url: urlA, _startTime: 0},
      {_timing: {sendEnd: 0, receiveHeadersEnd: 250}, finished: true, _url: urlB},
      // ignored for not having timing
      { },
      // ignored for not being the first of the origin
      {_timing: {sendEnd: 0, receiveHeadersEnd: 100}, finished: true, _url: urlA, _startTime: 100},
      // ignored for being redirected internally
      {_timing: {sendEnd: 0, receiveHeadersEnd: 100}, finished: true, _url: urlC, _startTime: 0,
        statusCode: 307},
      // ignored for not finishing
      {_timing: {sendEnd: 0, receiveHeadersEnd: -1}, finished: false},
    ];
    return FastPWAAudit.audit(generateArtifacts(5000, mockNetworkRecords)).then(result => {
      assert.equal(result.rawValue, true);
      assert.strictEqual(result.debugString, undefined);
      assert.ok(!result.details, 'does not contain details when latencies are realistic');
    });
  });
});
