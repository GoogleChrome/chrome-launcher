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

const Audit = require('../../../../src/audits/performance/first-meaningful-paint.js');
const assert = require('assert');

/* eslint-env mocha */
describe('Performance: first-meaningful-paint audit', () => {
  it('scores a -1 when no trace data is present', () => {
    return Audit.audit({}).then(response => {
      return assert.equal(response.value, -1);
    });
  });

  it('scores a -1 when faulty trace data is present', () => {
    return Audit.audit({boo: 'ya'}).then(response => {
      return assert.equal(response.value, -1);
    });
  });

  // TODO: replace example traces with real ones to actually pass.
  it.skip('scores a 100 when FMP is 500ms', () => {
    const traceData = require('./trace-500ms.json');
    return Audit.audit({traceContents: traceData}).then(response => {
      return assert.equal(response.value, 100);
    });
  });

  it.skip('scores a 100 when FMP is 1,000ms', () => {
    const traceData = require('./trace-1000ms.json');
    return Audit.audit({traceContents: traceData}).then(response => {
      return assert.equal(response.value, 100);
    });
  });

  it.skip('scores a 50 when FMP is 4,000ms', () => {
    const traceData = require('./trace-4000ms.json');
    return Audit.audit({traceContents: traceData}).then(response => {
      return assert.equal(response.value, 50);
    });
  });

  it.skip('scores a 0 when FMP is 15,000ms', () => {
    const traceData = require('./trace-15000ms.json');
    return Audit.audit({traceContents: traceData}).then(response => {
      return assert.equal(response.value, 0);
    });
  });
});
