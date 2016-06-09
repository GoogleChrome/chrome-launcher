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

const Audit = require('../../../src/audits/critical-request-chains.js');
const assert = require('assert');
const CriticalRequestChains = {
  0: {
    request: {
      endTime: 1,
      responseReceivedTime: 5,
      startTime: 0,
      url: 'https://example.com/'
    },
    children: {
      1: {
        request: {
          endTime: 16,
          responseReceivedTime: 14,
          startTime: 11,
          url: 'https://example.com/b.js'
        },
        children: {
        }
      },
      2: {
        request: {
          endTime: 17,
          responseReceivedTime: 15,
          startTime: 12,
          url: 'https://example.com/c.js'
        },
        children: {}
      }
    }
  }
};

/* eslint-env mocha */
describe('Performance: critical-request-chains audit', () => {
  it('calculates the correct chain length', () => {
    const output = Audit.audit({CriticalRequestChains});
    assert.equal(output.value, 2);
  });
});
