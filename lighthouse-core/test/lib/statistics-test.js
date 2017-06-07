/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const assert = require('assert');
const statistics = require('../../lib/statistics.js');

describe('log normal distribution', () => {
  it('creates a log normal distribution', () => {
    // This curve plotted with the below percentile assertions
    // https://www.desmos.com/calculator/vjk2rwd17y

    const median = 5000;
    const pODM = 3500;
    const distribution = statistics.getLogNormalDistribution(median, pODM);

    function getPct(distribution, value) {
      return Number(distribution.computeComplementaryPercentile(value).toFixed(2));
    }
    assert.equal(typeof distribution.computeComplementaryPercentile, 'function');
    assert.equal(getPct(distribution, 2000), 1.00, 'pct for 2000 does not match');
    assert.equal(getPct(distribution, 3000), 0.98, 'pct for 3000 does not match');
    assert.equal(getPct(distribution, 3500), 0.92, 'pct for 3500 does not match');
    assert.equal(getPct(distribution, 4000), 0.81, 'pct for 4000 does not match');
    assert.equal(getPct(distribution, 5000), 0.50, 'pct for 5000 does not match');
    assert.equal(getPct(distribution, 6000), 0.24, 'pct for 6000 does not match');
    assert.equal(getPct(distribution, 7000), 0.09, 'pct for 7000 does not match');
    assert.equal(getPct(distribution, 8000), 0.03, 'pct for 8000 does not match');
    assert.equal(getPct(distribution, 9000), 0.01, 'pct for 9000 does not match');
    assert.equal(getPct(distribution, 10000), 0.00, 'pct for 10000 does not match');
  });
});
