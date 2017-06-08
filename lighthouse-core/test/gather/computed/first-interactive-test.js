/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FirstInteractive = require('../../../gather/computed/first-interactive');
const firstInteractive = new FirstInteractive();
const TracingProcessor = require('../../../lib/traces/tracing-processor.js');
const Runner = require('../../../runner.js');

const tooShortTrace = require('../../fixtures/traces/progressive-app.json');
const acceptableTrace = require('../../fixtures/traces/progressive-app-m60.json');
const redirectTrace = require('../../fixtures/traces/site-with-redirect.json');

const assert = require('assert');

/* eslint-env mocha */
describe('FirstInteractive computed artifact:', () => {
  let computedArtifacts;

  beforeEach(() => {
    computedArtifacts = Runner.instantiateComputedArtifacts();
  });

  it('throws on short traces', () => {
    return computedArtifacts.requestFirstInteractive({traceEvents: tooShortTrace}).then(() => {
      assert.ok(false, 'should have thrown for short trace');
    }).catch(err => {
      assert.equal(err.message, 'trace not at least 5 seconds longer than FMP');
    });
  });

  it('should compute firstInteractive', () => {
    return computedArtifacts.requestFirstInteractive(acceptableTrace).then(output => {
      assert.equal(Math.round(output.timeInMs), 1582);
      assert.ok(output.timestamp, 'output is missing timestamp');
    });
  });

  it('should compute firstInteractive on pages with redirect', () => {
    return computedArtifacts.requestFirstInteractive(redirectTrace).then(output => {
      assert.equal(Math.round(output.timeInMs), 2712);
      assert.ok(output.timestamp, 'output is missing timestamp');
    });
  });

  describe('#computeWithArtifacts', () => {
    let mainThreadEvents;
    let originalMainThreadEventsFunc;

    before(() => {
      originalMainThreadEventsFunc = TracingProcessor.getMainThreadTopLevelEvents;
      TracingProcessor.getMainThreadTopLevelEvents = () => mainThreadEvents
          .map(evt => Object.assign(evt, {duration: evt.end - evt.start}));
    });

    after(() => {
      TracingProcessor.getMainThreadTopLevelEvents = originalMainThreadEventsFunc;
    });

    it('should throw when trace is not long enough after FMP', () => {
      assert.throws(() => {
        firstInteractive.computeWithArtifacts({
          timings: {
            firstMeaningfulPaint: 3400,
            traceEnd: 4500,
          },
          timestamps: {
            navigationStart: 0,
          },
        });
      }, /longer than FMP/);
    });

    it('should return FMP when no trace events are found', () => {
      mainThreadEvents = [];

      const result = firstInteractive.computeWithArtifacts({
        timings: {
          firstMeaningfulPaint: 3400,
          domContentLoaded: 2000,
          traceEnd: 12000,
        },
        timestamps: {
          navigationStart: 600 * 1000,
        },
      });

      assert.equal(result.timeInMs, 3400);
      assert.equal(result.timestamp, 4000000);
    });

    it('should not return a time earlier than FMP', () => {
      mainThreadEvents = [];

      const result = firstInteractive.computeWithArtifacts({
        timings: {
          firstMeaningfulPaint: 3400,
          domContentLoaded: 2000,
          traceEnd: 12000,
        },
        timestamps: {
          navigationStart: 0,
        },
      });

      assert.equal(result.timeInMs, 3400);
    });

    it('should return DCL when DCL is after FMP', () => {
      mainThreadEvents = [];

      const result = firstInteractive.computeWithArtifacts({
        timings: {
          firstMeaningfulPaint: 3400,
          domContentLoaded: 7000,
          traceEnd: 12000,
        },
        timestamps: {
          navigationStart: 0,
        },
      });

      assert.equal(result.timeInMs, 7000);
    });

    it('should return DCL when DCL is after interactive', () => {
      mainThreadEvents = [
        {start: 5000, end: 5100},
      ];

      const result = firstInteractive.computeWithArtifacts({
        timings: {
          firstMeaningfulPaint: 3400,
          domContentLoaded: 7000,
          traceEnd: 12000,
        },
        timestamps: {
          navigationStart: 0,
        },
      });

      assert.equal(result.timeInMs, 7000);
    });

    it('should return the quiet window', () => {
      mainThreadEvents = [
        {start: 4000, end: 4200},
        {start: 9000, end: 9500},
        {start: 12000, end: 12100}, // light task
      ];

      const result = firstInteractive.computeWithArtifacts({
        timings: {
          firstMeaningfulPaint: 3400,
          domContentLoaded: 2300,
          traceEnd: 24000,
        },
        timestamps: {
          navigationStart: 0,
        },
      });

      assert.equal(result.timeInMs, 9500);
    });
  });

  describe('#findQuietWindow', () => {
    it('should return FMP when there are no long tasks', () => {
      const result = FirstInteractive.findQuietWindow(200, 1000, []);
      assert.equal(result, 200);
    });

    it('should return FMP when long tasks are more than 5s out', () => {
      const longTasks = [{start: 5600, end: 6000}];
      const result = FirstInteractive.findQuietWindow(200, 60000, longTasks);
      assert.equal(result, 200);
    });

    it('should return first empty window of 5s', () => {
      const longTasks = [
        {start: 2200, end: 4000},
        {start: 9000, end: 10000},
      ];
      const result = FirstInteractive.findQuietWindow(200, 60000, longTasks);
      assert.equal(result, 4000);
    });

    it('should allow smaller windows farther away', () => {
      const longTasks = [
        {start: 2200, end: 15000},
        {start: 18500, end: 20000}, // window of only 3.5 seconds
      ];
      const result = FirstInteractive.findQuietWindow(200, 60000, longTasks);
      assert.equal(result, 15000);
    });

    it('should allow light task clusters', () => {
      const longTasks = [
        {start: 2200, end: 10000},
        {start: 11000, end: 11500},

        // first light task cluster
        {start: 12750, end: 12825},
        {start: 12850, end: 12930},
        {start: 12935, end: 12990},

        // second light task cluster
        {start: 14000, end: 14200},
      ];
      const result = FirstInteractive.findQuietWindow(5000, 60000, longTasks);
      assert.equal(result, 11500);
    });

    it('should allow heavy clusters after a long quiet period', () => {
      const longTasks = [
        {start: 5000, end: 5100},
        {start: 10500, end: 12000},
        {start: 12500, end: 16500},
      ];

      const result = FirstInteractive.findQuietWindow(5000, 60000, longTasks);
      assert.equal(result, 5100);
    });

    it('should not allow tasks in the first 5s after FMP to be light', () => {
      const longTasks = [
        {start: 2200, end: 10000},
        {start: 11000, end: 11500},

        // first light task cluster
        {start: 12750, end: 12825},
        {start: 12850, end: 12930},
        {start: 12935, end: 12990},
      ];

      const result = FirstInteractive.findQuietWindow(10000, 60000, longTasks);
      assert.equal(result, 12990);
    });

    it('should not allow large tasks in light cluster', () => {
      const longTasks = [
        {start: 2200, end: 10000},
        {start: 11000, end: 11500},

        // first light task cluster
        {start: 12750, end: 12825},
        {start: 12850, end: 12930},
        {start: 12935, end: 12990},

        {start: 14000, end: 17000},
      ];

      const result = FirstInteractive.findQuietWindow(5000, 60000, longTasks);
      assert.equal(result, 17000);
    });

    it('should not allow start of cluster to be first quiet', () => {
      const longTasks = [
        {start: 10000, end: 10500},
        {start: 10600, end: 10700},
      ];

      const result = FirstInteractive.findQuietWindow(5000, 60000, longTasks);
      assert.equal(result, 10700);
    });

    it('should not allow heavy clusters at the very end of a window', () => {
      const longTasks = [
        {start: 5000, end: 5100},
        {start: 10050, end: 10100},
        {start: 10500, end: 16500},
      ];

      const result = FirstInteractive.findQuietWindow(5000, 60000, longTasks);
      assert.equal(result, 16500);
    });

    it('should throw when long tasks are too close to traceEnd', () => {
      const longTasks = [{start: 4000, end: 5700}];
      assert.throws(() => {
        FirstInteractive.findQuietWindow(200, 6000, longTasks);
      }, /main thread was busy/);
    });
  });
});
