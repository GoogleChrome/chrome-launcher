/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');

/* eslint-env mocha */
const TracingProcessor = require('../../../lib/traces/tracing-processor');
const pwaTrace = require('../../fixtures/traces/progressive-app.json');
const defaultPercentiles = [0, 0.25, 0.5, 0.75, 0.9, 0.99, 1];

const TraceOfTab = require('../../../gather/computed/trace-of-tab');

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

  describe('getMainThreadTopLevelEvents', () => {
    it('gets durations of top-level tasks', () => {
      const trace = {traceEvents: pwaTrace};
      const tabTrace = new TraceOfTab().compute_(trace);
      const ret = TracingProcessor.getMainThreadTopLevelEvents(tabTrace);

      assert.equal(ret.length, 645);
    });

    it('filters events based on start and end times', () => {
      const baseTime = 20000 * 1000;
      const name = 'TaskQueueManager::ProcessTaskFromWorkQueue';
      const tabTrace = {
        navigationStartEvt: {ts: baseTime},
        mainThreadEvents: [
          // 15ms to 25ms
          {ts: baseTime + 15 * 1000, dur: 10 * 1000, name},
          // 40ms to 60ms
          {ts: baseTime + 40 * 1000, dur: 20 * 1000, name},
          // 1000ms to 2000ms
          {ts: baseTime + 1000 * 1000, dur: 1000 * 1000, name},
          // 4000ms to 4020ms
          {ts: baseTime + 4000 * 1000, dur: 20 * 1000, name},
        ],
      };

      const ret = TracingProcessor.getMainThreadTopLevelEvents(
        tabTrace,
        50,
        1500
      );
      assert.equal(ret.length, 2);
      assert.equal(ret[0].start, 40);
      assert.equal(ret[0].end, 60);
      assert.equal(ret[0].duration, 20);
      assert.equal(ret[1].start, 1000);
      assert.equal(ret[1].end, 2000);
      assert.equal(ret[1].duration, 1000);
    });
  });

  describe('getMainThreadTopLevelEventDurations', () => {
    it('gets durations of top-level tasks', () => {
      const trace = {traceEvents: pwaTrace};
      const tabTrace = new TraceOfTab().compute_(trace);
      const ret = TracingProcessor.getMainThreadTopLevelEventDurations(tabTrace);
      const durations = ret.durations;

      function getDurationFromIndex(index) {
        return Number(durations[index].toFixed(2));
      }

      assert.equal(durations.filter(dur => isNaN(dur)).length, 0, 'NaN found');
      assert.equal(durations.length, 645);

      assert.equal(getDurationFromIndex(50), 0.01);
      assert.equal(getDurationFromIndex(300), 0.04);
      assert.equal(getDurationFromIndex(400), 0.07);
      assert.equal(getDurationFromIndex(durations.length - 3), 26.01);
      assert.equal(getDurationFromIndex(durations.length - 2), 36.9);
      assert.equal(getDurationFromIndex(durations.length - 1), 38.53);
    });
  });

  describe('risk to responsiveness', () => {
    let oldFn;
    // monkeypatch _riskPercentiles to test just getRiskToResponsiveness
    beforeEach(() => {
      oldFn = TracingProcessor._riskPercentiles;
      TracingProcessor._riskPercentiles = (durations, totalTime, percentiles, clippedLength) => {
        return {
          durations, totalTime, percentiles, clippedLength
        };
      };
    });

    it('compute correct defaults', () => {
      const trace = {traceEvents: pwaTrace};
      const tabTrace = new TraceOfTab().compute_(trace);
      const ret = TracingProcessor.getRiskToResponsiveness(tabTrace);
      assert.equal(ret.durations.length, 645);
      assert.equal(Math.round(ret.totalTime), 2143);
      assert.equal(ret.clippedLength, 0);
      assert.deepEqual(ret.percentiles, [0.5, 0.75, 0.9, 0.99, 1]);
    });

    afterEach(() => {
      TracingProcessor._riskPercentiles = oldFn;
    });
  });
});
