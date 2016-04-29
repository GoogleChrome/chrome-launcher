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
const Audit = require('../../../src/audits/performance/speed-index-metric.js');
const assert = require('assert');

/* global describe, it*/
describe('Performance: speed-index-metric audit', () => {
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

  // TODO(samthor): speedIndex requires trace data with frame data. Include multiple short samples.
  it('scores a 99 when speedIndex is 1294ms', () => {
    const traceData = require('./progressive-app.json');
    return Audit.audit({traceContents: traceData}).then(response => {
      return assert.equal(response.value, 99);
    });
  });
});
