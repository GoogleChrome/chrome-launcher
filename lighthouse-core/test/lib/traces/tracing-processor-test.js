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

let TracingProcessor;
const assert = require('assert');

/* eslint-env mocha */
const pwaTrace = require('../../fixtures/traces/progressive-app.json');
const defaultPercentiles = [0, 0.25, 0.5, 0.75, 0.9, 0.99, 1];

/**
 * Create a riskPercentiles result object by matching the values in percentiles
 * and times.
 * @param {!Array<number>} percentiles
 * @param {!Array<number>} times
 * @return {!Array<{percentile: number, time: number}>}
 */
function createRiskPercentiles(percentiles, times) {
  return percentiles.map((percentile, index) => {
    return {
      percentile,
      time: times[index]
    };
  });
}

describe('TracingProcessor lib', () => {
  it('doesn\'t throw when module is loaded', () => {
    assert.doesNotThrow(_ => {
      TracingProcessor = require('../../../lib/traces/tracing-processor');
    });
  });

  describe('riskPercentiles calculation', () => {
    it('correctly calculates percentiles of no tasks', () => {
      const results = TracingProcessor._riskPercentiles([], 100, defaultPercentiles);
      const expected = createRiskPercentiles(defaultPercentiles, [16, 16, 16, 16, 16, 16, 16]);
      assert.deepEqual(results, expected);
    });

    it('correctly calculates percentiles of a single task with idle time', () => {
      const results = TracingProcessor._riskPercentiles([50], 100, defaultPercentiles);
      const expected = createRiskPercentiles(defaultPercentiles, [16, 16, 16, 41, 56, 65, 66]);
      assert.deepEqual(results, expected);
    });

    it('correctly calculates percentiles of a single task with no idle time', () => {
      const results = TracingProcessor._riskPercentiles([50], 50, defaultPercentiles);
      const expected = createRiskPercentiles(defaultPercentiles,
          [16, 28.5, 41, 53.5, 61, 65.5, 66]);
      assert.deepEqual(results, expected);
    });

    it('correctly calculates percentiles of several equal-length tasks', () => {
      const results = TracingProcessor._riskPercentiles([50, 50, 50, 50], 400, defaultPercentiles);
      const expected = createRiskPercentiles(defaultPercentiles, [16, 16, 16, 41, 56, 65, 66]);
      assert.deepEqual(results, expected);
    });

    it('correctly calculates percentiles of tasks including zero-length durations', () => {
      const results = TracingProcessor._riskPercentiles([0, 0, 0, 10, 20, 20, 30, 30, 120], 320,
          defaultPercentiles);
      const expected = createRiskPercentiles(defaultPercentiles, [16, 16, 28, 56, 104, 132.8, 136]);
      assert.deepEqual(results, expected);
    });

    // Three tasks of one second each, all within a five-second window.
    // Mean Queueing Time of 300ms.
    it('correctly calculates percentiles of three one-second tasks in a five-second window', () => {
      const results = TracingProcessor._riskPercentiles([1000, 1000, 1000], 5000,
          defaultPercentiles, 0);
      // Round to hundredths to simplify floating point comparison.
      results.forEach(result => {
        result.time = Number(result.time.toFixed(2));
      });

      const expected = createRiskPercentiles(defaultPercentiles,
          [16, 16, 182.67, 599.33, 849.33, 999.33, 1016]);
      assert.deepEqual(results, expected);
    });

    it('correctly calculates percentiles of tasks with a clipped task', () => {
      const results = TracingProcessor._riskPercentiles([10, 20, 50, 60, 90, 100], 300,
          defaultPercentiles, 30);
      // Round to hundredths to simplify floating point comparison.
      results.forEach(result => {
        result.time = Number(result.time.toFixed(2));
      });

      const expected = createRiskPercentiles(defaultPercentiles,
          [16, 32.25, 53.5, 74.33, 96, 113, 116]);
      assert.deepEqual(results, expected);
    });

    // One 20 second long task over three five-second windows.
    it('correctly calculates percentiles of single task over multiple windows', () => {
      // Starts 3 seconds into the first window. Mean Queueing Time = 7600ms.
      const TASK_LENGTH = 20000;
      const results1 = TracingProcessor._riskPercentiles([TASK_LENGTH], 5000,
          defaultPercentiles, TASK_LENGTH - 2000);
      const expected1 = createRiskPercentiles(defaultPercentiles,
          [16, 16, 16, 18766, 19516, 19966, 20016]);
      assert.deepEqual(results1, expected1);

      // Starts 2 seconds before and ends 13 seconds after. Mean Queueing Time = 15500ms.
      const results2 = TracingProcessor._riskPercentiles([TASK_LENGTH - 2000], 5000,
          defaultPercentiles, TASK_LENGTH - 7000);
      const expected2 = createRiskPercentiles(defaultPercentiles,
          [16, 14266, 15516, 16766, 17516, 17966, 18016]);
      assert.deepEqual(results2, expected2);

      // Starts 17 seconds before and ends 3 seconds into the window. Mean Queueing Time = 900ms.
      const results3 = TracingProcessor._riskPercentiles([TASK_LENGTH - 17000], 5000,
          defaultPercentiles, 0);
      const expected3 = createRiskPercentiles(defaultPercentiles,
          [16, 16, 516, 1766, 2516, 2966, 3016]);
      assert.deepEqual(results3, expected3);
    });

    it('correctly calculates with a task shorter than the clipped length of another', () => {
      const results = TracingProcessor._riskPercentiles([40, 100], 100,
          defaultPercentiles, 50);
      const expected = createRiskPercentiles(defaultPercentiles,
          [16, 31, 56, 91, 106, 115, 116]);
      assert.deepEqual(results, expected);
    });

    it('correctly calculates with a task clipped completely', () => {
      const results = TracingProcessor._riskPercentiles([40, 100], 100,
          defaultPercentiles, 100);
      const expected = createRiskPercentiles(defaultPercentiles,
          [16, 16, 16, 31, 46, 55, 56]);
      assert.deepEqual(results, expected);
    });

    it('does not divide by zero when duration sum is less than whole', () => {
      // Durations chosen such that, due to floating point error:
      //   const idleTime = totalTime - (duration1 + duration2);
      //   (idleTime + duration1 + duration2) < totalTime
      const duration1 = 67 / 107;
      const duration2 = 67 / 53;
      const totalTime = 10;
      const results = TracingProcessor._riskPercentiles([duration1, duration2], totalTime, [1], 0);
      const expected = createRiskPercentiles([1], [16 + duration2]);
      assert.deepEqual(results, expected);
    });
  });

  describe('log normal distribution', () => {
    it('creates a log normal distribution', () => {
      // This curve plotted with the below percentile assertions
      // https://www.desmos.com/calculator/vjk2rwd17y

      const median = 5000;
      const pODM = 3500;
      const distribution = TracingProcessor.getLogNormalDistribution(median, pODM);

      function getPct(distribution, value) {
        return distribution.computeComplementaryPercentile(value).toFixed(2);
      }
      assert.equal(typeof distribution.computeComplementaryPercentile, 'function');
      assert.equal(getPct(distribution, 2000), '1.00', 'pct for 2000 does not match');
      assert.equal(getPct(distribution, 3000), '0.98', 'pct for 3000 does not match');
      assert.equal(getPct(distribution, 3500), '0.92', 'pct for 3500 does not match');
      assert.equal(getPct(distribution, 4000), '0.81', 'pct for 4000 does not match');
      assert.equal(getPct(distribution, 5000), '0.50', 'pct for 5000 does not match');
      assert.equal(getPct(distribution, 6000), '0.24', 'pct for 6000 does not match');
      assert.equal(getPct(distribution, 7000), '0.09', 'pct for 7000 does not match');
      assert.equal(getPct(distribution, 8000), '0.03', 'pct for 8000 does not match');
      assert.equal(getPct(distribution, 9000), '0.01', 'pct for 9000 does not match');
      assert.equal(getPct(distribution, 10000), '0.00', 'pct for 10000 does not match');
    });
  });

  describe('risk to responsiveness', () => {
    let oldFn;
    // monkeypatch _riskPercentiles to deal with gRtR solo
    beforeEach(() => {
      oldFn = TracingProcessor._riskPercentiles;
      TracingProcessor._riskPercentiles = (durations, totalTime, percentiles, clippedLength) => {
        return {
          durations, totalTime, percentiles, clippedLength
        };
      };
    });
    afterEach(() => {
      TracingProcessor._riskPercentiles = oldFn;
    });

    it('gets durations of top-level tasks', () => {
      const tracingProcessor = new TracingProcessor();
      const model = tracingProcessor.init(pwaTrace);
      const ret = TracingProcessor.getRiskToResponsiveness(model, {traceEvents: pwaTrace});
      const durations = ret.durations;

      assert.equal(durations.filter(dur => isNaN(dur)).length, 0, 'NaN found');
      assert.equal(durations.length, 309);
      assert.equal(durations[50], 0.012);
      assert.equal(durations[100], 0.053);
      assert.equal(durations[200], 0.558);
      assert.equal(durations[durations.length - 3].toFixed(2), '26.32');
      assert.equal(durations[durations.length - 2].toFixed(2), '37.61');
      assert.equal(durations[durations.length - 1].toFixed(2), '40.10');
    });
  });
});
