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
  it('aggregates', () => {
    const fakeAggregations = [{
      name: 'name',
      description: 'description',
      scored: true,
      items: [{
        name: 'item name',
        description: 'item description',
        criteria: {
          'first-meaningful-paint': {
            value: 100,
            weight: 1
          }
        }
      }]
    }];
    return Aggregator
      .aggregate(fakeAggregations, [{
        name: 'first-meaningful-paint',
        value: 90
      }])
      .then(modifiedResults => {
        assert.equal(modifiedResults[0].name, fakeAggregations[0].name);
        assert.equal(modifiedResults[0].score[0].overall, 0.9);
      });
  });
});
