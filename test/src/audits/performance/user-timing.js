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

const Audit = require('../../../../src/audits/performance/user-timings.js');
const assert = require('assert');
const traceContents = require('./trace-user-timings.json');

/* eslint-env mocha */
describe('Performance: user-timings audit', () => {
  it('fails gracefully', () => {
    const output = Audit.audit({});
    assert.equal(output.value, -1);
  });

  it('processes a trace file for user timing data', () => {
    const output = Audit.audit({traceContents});
    assert.equal(output.value, 1);
    assert.equal(output.extendedInfo.value[0].name, 'elapsed');
  });

  it('handles valid traces with no user timing data', () => {
    const output = Audit.audit({traceContents: traceContents.slice(0, 1)});
    assert.equal(output.value, 0);
    assert.equal(output.extendedInfo.value.length, 0);
  });
});
