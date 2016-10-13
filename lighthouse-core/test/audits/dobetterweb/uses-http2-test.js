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

const UsesHTTP2Audit = require('../../../audits/dobetterweb/uses-http2.js');
const assert = require('assert');

const URL = 'https://webtide.com/http2-push-demo/';
const networkRecords = require('../../fixtures/networkRecords-mix.json');
const h2Records = require('../../fixtures/networkRecords-h2push.json');

/* eslint-env mocha */

describe('Resources are fetched over http/2', () => {
  it('fails when no input present', () => {
    const auditResult = UsesHTTP2Audit.audit({});
    assert.equal(auditResult.rawValue, -1);
    assert.ok(auditResult.debugString);
  });

  it('fails when some resources were requested via http/1.x', () => {
    const auditResult = UsesHTTP2Audit.audit({
      URL: {finalUrl: URL},
      networkRecords: {[UsesHTTP2Audit.DEFAULT_PASS]: networkRecords}
    });
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.displayValue.match('4 resources were not'));
    assert.equal(auditResult.extendedInfo.value.length, 4);
  });

  it('displayValue is correct when only one resource fails', () => {
    const entryWithHTTP1 = networkRecords.slice(1, 2);
    const auditResult = UsesHTTP2Audit.audit({
      URL: {finalUrl: URL},
      networkRecords: {[UsesHTTP2Audit.DEFAULT_PASS]: entryWithHTTP1}
    });
    assert.ok(auditResult.displayValue.match('1 resource was not'));
  });

  it('passes when all resources were requested via http/2', () => {
    const auditResult = UsesHTTP2Audit.audit({
      URL: {finalUrl: URL},
      networkRecords: {[UsesHTTP2Audit.DEFAULT_PASS]: h2Records}
    });
    assert.equal(auditResult.rawValue, true);
    assert.ok(auditResult.displayValue === '');
  });
});
