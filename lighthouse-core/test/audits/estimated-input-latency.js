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
const assert = require('assert');
const traceContents = require('../fixtures/traces/progressive-app.json');

/* eslint-env mocha */

describe('Performance: estimated-input-latency audit', () => {
  it('scores a -1 with invalid trace data', () => {
    const output = Audit.audit({
      traceContents: '[{"pid": 15256,"tid": 1295,"t',
      Speedline: {
        first: 500
      }
    });
    assert.equal(output.value, -1);
    assert(output.debugString);
  });

  it('evaluates valid input correctly', () => {
    const output = Audit.audit({
      traceContents,
      Speedline: {
        first: 500
      }
    });

    assert.equal(output.rawValue, '17.4ms');
    assert.equal(output.value, 100);
  });
});
