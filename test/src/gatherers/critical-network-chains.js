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

/* eslint-env mocha */

const GathererClass = require('../../../src/gatherers/critical-network-chains');
const assert = require('assert');

const Gatherer = new GathererClass();

// We'll have to pull a lot of shenanigans becase assert.deepEqual does not
// properly support ES6 sets yet (see github.com/nodejs/node/issues/2309)

/**
 * Boolean version of assert.deepEqual
 * Obviously this doesn't work on ES6 sets
 */
function isDeepEqual(obj1, obj2) {
  try {
    assert.deepEqual(obj1, obj2);
    return true;
  } catch (e) {
    return false;
  }
}

function deepEqualSet(set1, set2) {
  if (set1.size !== set2.size) {
    return false;
  }

  const set2Copy = new Set([...set2.values()]);
  // Horrible horrible O(n^2) check. I assume the max size of sets will be
  // 10 and thus hereby declare this O(1).
  for (let elm of set1.values()) {
    let found = false;
    for (let set2elm of set2Copy.values()) {
      if (isDeepEqual(elm, set2elm)) {
        found = true;
        // Tiny optimization
        set2Copy.delete(set2elm);
        break;
      }
    }
    if (!found) {
      return false;
    }
  }

  return true;
}

const HIGH = 'High';
const VERY_HIGH = 'VeryHigh';
const MEDIUM = 'Medium';
const LOW = 'Low';
const VERY_LOW = 'VeryLow';

function mockTracingData(prioritiesList, edges) {
  const networkRecords = prioritiesList.map((priority, index) =>
      ({requestId: index,
        initialPriority: () => priority,
        initiatorRequest: () => null}));

  // Add a high priority request at the beginning - that's the first webpage req
  const firstNetworkRequest = {
    requestId: '-1',
    initialPriority: () => VERY_HIGH,
    initiatorRequest: () => null
  };

  // add mock initiator information
  edges.forEach(edge => {
    networkRecords[edge[1]].initiatorRequest = () => ({requestId: edge[0]});
  });

  return [firstNetworkRequest].concat(networkRecords);
}

function testGetCriticalChain(data) {
  const mockNetworkRecords = mockTracingData(data.priorityList, data.edges);
  const criticalChains = Gatherer.getCriticalChains(mockNetworkRecords);
  // It is sufficient to only check the requestIds are correct in the chain
  const requestIdChains = criticalChains.map(chain =>
    chain.map(node => node.requestId));
  // Ordering of the chains do not matter
  assert(deepEqualSet(new Set(requestIdChains), new Set(data.expectedChains)));
}

describe('CriticalNetworkChain gatherer: getCriticalChain function', () => {
  describe('Meta Testing: deepEqualSet', () => {
    it('says equal sets are equal', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([1, 3, 2]);
      assert(deepEqualSet(a, b));
    });

    it('says deeply equal sets are equal', () => {
      const a = new Set([[0, 1], [1, 2], [2, 3]]);
      const b = new Set([[0, 1], [2, 3], [1, 2]]);
      assert(deepEqualSet(a, b));
    });

    it('says unequal sets are unequal', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([1, 2]);
      assert(!deepEqualSet(a, b));
    });
  });

  it('returns correct data for chain of four critical requests', () =>
    testGetCriticalChain({
      priorityList: [HIGH, MEDIUM, VERY_HIGH, HIGH],
      edges: [[0, 1], [1, 2], [2, 3]],
      expectedChains: [[0, 1, 2, 3]]
    }));

  it('returns correct data for chain interleaved with non-critical requests',
    () => testGetCriticalChain({
      priorityList: [MEDIUM, HIGH, LOW, MEDIUM, HIGH, VERY_LOW],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
      expectedChains: [[0, 1], [3, 4]]
    }));

  it('returns correct data for two parallel chains', () =>
    testGetCriticalChain({
      priorityList: [HIGH, HIGH, HIGH, HIGH],
      edges: [[0, 2], [1, 3]],
      expectedChains: [[1, 3], [0, 2]]
    }));

  it('returns correct data for fork at root', () =>
    testGetCriticalChain({
      priorityList: [HIGH, HIGH, HIGH],
      edges: [[0, 1], [0, 2]],
      expectedChains: [[0, 1], [0, 2]]
    }));

  it('returns correct data for fork at non root', () =>
    testGetCriticalChain({
      priorityList: [HIGH, HIGH, HIGH, HIGH],
      edges: [[0, 1], [1, 2], [1, 3]],
      expectedChains: [[0, 1, 2], [0, 1, 3]]
    }));

  it('returns empty chain list when no critical request', () =>
    testGetCriticalChain({
      priorityList: [LOW, LOW],
      edges: [[0, 1]],
      expectedChains: []
    }));

  it('returns empty chain list when no request whatsoever', () =>
    testGetCriticalChain({
      priorityList: [],
      edges: [],
      expectedChains: []
    }));

  it('returns two single node chains for two independent requests', () =>
    testGetCriticalChain({
      priorityList: [HIGH, HIGH],
      edges: [],
      expectedChains: [[0], [1]]
    }));

  it('returns correct data on a random big graph', () =>
    testGetCriticalChain({
      priorityList: Array(9).fill(HIGH),
      edges: [[0, 1], [1, 2], [1, 3], [4, 5], [5, 7], [7, 8], [5, 6]],
      expectedChains: [
        [0, 1, 2], [0, 1, 3], [4, 5, 7, 8], [4, 5, 6]
      ]}));
});
