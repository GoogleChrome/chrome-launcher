/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const CriticalRequestChains = require('../../audits/critical-request-chains.js');
const assert = require('assert');

const FAILING_REQUEST_CHAIN = {
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

const PASSING_REQUEST_CHAIN = {
  0: {
    request: {
      endTime: 1,
      responseReceivedTime: 5,
      startTime: 0,
      url: 'https://example.com/'
    },
    children: {},
  },
};

const PASSING_REQUEST_CHAIN_2 = {
  13653.1: {
    request: {
      url: 'http://localhost:10503/offline-ready.html',
      startTime: 33552.036878,
      endTime: 33552.285438,
      responseReceivedTime: 33552.275677,
      transferSize: 1849
    },
    children: {}
  }
};

const EMPTY_REQUEST_CHAIN = {};

const mockArtifacts = (mockChain) => {
  return {
    devtoolsLogs: {
      [CriticalRequestChains.DEFAULT_PASS]: []
    },
    requestNetworkRecords: () => {
      return Promise.resolve([]);
    },
    requestCriticalRequestChains: function() {
      return Promise.resolve(mockChain);
    }
  };
};

describe('Performance: critical-request-chains audit', () => {
  it('calculates the correct chain result for failing example', () => {
    return CriticalRequestChains.audit(mockArtifacts(FAILING_REQUEST_CHAIN)).then(output => {
      assert.equal(output.displayValue, 2);
      assert.equal(output.rawValue, false);
      assert.ok(output.details);
    });
  });

  it('calculates the correct chain result for passing example', () => {
    return CriticalRequestChains.audit(mockArtifacts(PASSING_REQUEST_CHAIN)).then(output => {
      assert.equal(output.details.longestChain.duration, 1000);
      assert.equal(output.displayValue, 0);
      assert.equal(output.rawValue, true);
    });
  });

  it('calculates the correct chain result for passing example (no 2.)', () => {
    return CriticalRequestChains.audit(mockArtifacts(PASSING_REQUEST_CHAIN_2)).then(output => {
      assert.equal(output.displayValue, 0);
      assert.equal(output.rawValue, true);
    });
  });

  it('calculates the correct chain result for empty example', () => {
    return CriticalRequestChains.audit(mockArtifacts(EMPTY_REQUEST_CHAIN)).then(output => {
      assert.equal(output.displayValue, 0);
      assert.equal(output.rawValue, true);
    });
  });
});
