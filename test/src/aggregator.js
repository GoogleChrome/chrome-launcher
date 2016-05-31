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
const Aggregator = require('../../src/aggregator');
const assert = require('assert');

/* global describe, it*/

describe('Aggregator', () => {
  it('maps all aggregations to an array of Promises', () => {
    const fakeAggregators = [{
      aggregate(results) {
        return results.map(r => (r + 1));
      }
    }, {
      aggregate(results) {
        return results.map(r => (r - 1));
      }
    }];
    return Aggregator
      .aggregate(fakeAggregators, [1, 2, 3])
      .then(modifiedResults => {
        assert.ok(Array.isArray(modifiedResults));
        assert.deepEqual(modifiedResults[0], [2, 3, 4]);
        assert.deepEqual(modifiedResults[1], [0, 1, 2]);
      });
  });
});
