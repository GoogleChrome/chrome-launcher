/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const TracingProcessor = require('../../lib/traces/tracing-processor');

const LONG_TASK_THRESHOLD = 50;

const MAX_TASK_CLUSTER_DURATION = 250;
const MIN_TASK_CLUSTER_PADDING = 1000;
const MIN_TASK_CLUSTER_FMP_DISTANCE = 5000;

const MAX_QUIET_WINDOW_SIZE = 5000;
const TRACE_BUSY_MSG = 'The main thread was busy for the entire trace recording. ' +
   'First Interactive requires the main thread to be idle for several seconds.';

// Window size should be three seconds at 15 seconds after FMP
const EXPONENTIATION_COEFFICIENT = -Math.log(3 - 1) / 15;

/**
 * @fileoverview This artifact identifies the time the page is "first interactive" as defined below
 * @see https://docs.google.com/document/d/1GGiI9-7KeY3TPqS3YT271upUVimo-XiL5mwWorDUD4c/edit#
 *
 * First Interactive marks the first moment when a website is minimally interactive:
 *    > Enough (but maybe not all) UI components shown on the screen are interactive
 *      DISCLAIMER: This is assumed by virtue of the fact that the CPU is idle; actual event
 *      listeners are not examined. Server-side rendering and extreme network latency can trick this
 *      definition.
 *    > The page responds to user input in a reasonable time on average, but it’s ok if this
 *      response is not always immediate.
 *
 * First Interactive is defined as the first period after FMP of N-seconds that has no bad task
 * clusters.
 *
 *    > t = time in seconds since FMP
 *    > N = f(t) = 4 * e^(-0.045 * t) + 1
 *      5 = f(0) = 4 + 1
 *      3 ~= f(15) ~= 2 + 1
 *      1 ~= f(∞) ~= 0 + 1
 *    > a "bad task cluster" is a cluster of 1 or more long tasks with less than 1s of idle time
 *      between each task that does one of the following
 *        > Starts within the first 5s after FMP.
 *        > Spans more than 250ms from the start of the earliest task in the cluster to the end of the
 *          latest task in the cluster.
 *
 * If this timestamp is earlier than DOMContentLoaded, use DOMContentLoaded as firstInteractive.
 */
class FirstInteractive extends ComputedArtifact {
  get name() {
    return 'FirstInteractive';
  }

  /**
   * @param {number} t The time passed since FMP in miliseconds.
   * @return {number}
   */
  static getRequiredWindowSizeInMs(t) {
    const tInSeconds = t / 1000;
    const exponentiationComponent = Math.exp(EXPONENTIATION_COEFFICIENT * tInSeconds);
    return (4 * exponentiationComponent + 1) * 1000;
  }

  /**
   * Clusters tasks after startIndex that are in the specified window if they are within
   * MIN_TASK_CLUSTER_PADDING ms of each other. Can return tasks that start outside of the window,
   * but all clusters are guaranteed to have started before windowEnd.
   * @param {!Array<{start: number, end: number}>} tasks
   * @param {number} startIndex
   * @param {number} windowEnd
   * @return {!Array<{start: number, end: number, duration: number}>}
   */
  static getTaskClustersInWindow(tasks, startIndex, windowEnd) {
    const clusters = [];

    let previousTaskEndTime = -Infinity;
    let currentCluster = null;

    // Examine all tasks that could possibly be part of a cluster starting before windowEnd.
    // Consider the case where window end is 15s, there's a 100ms task from 14.9-15s and a 500ms
    // task from 15.5-16s, we need that later task to be clustered with the first so we can properly
    // identify that main thread isn't quiet.
    const clusteringWindowEnd = windowEnd + MIN_TASK_CLUSTER_PADDING;
    const isInClusteringWindow = task => task.start < clusteringWindowEnd;
    for (let i = startIndex; i < tasks.length; i++) {
      if (!isInClusteringWindow(tasks[i])) {
        break;
      }

      const task = tasks[i];

      // if enough time has elapsed, we'll create a new cluster
      if (task.start - previousTaskEndTime > MIN_TASK_CLUSTER_PADDING) {
        currentCluster = [];
        clusters.push(currentCluster);
      }

      currentCluster.push(task);
      previousTaskEndTime = task.end;
    }

    return clusters
      // add some useful information about the cluster
      .map(tasks => {
        const start = tasks[0].start;
        const end = tasks[tasks.length - 1].end;
        const duration = end - start;
        return {start, end, duration};
      })
      // filter out clusters that started after the window because of our clusteringWindowEnd
      .filter(cluster => cluster.start < windowEnd);
  }

  /**
   * Finds the timeInMs of the start of the first quiet window as defined by the firstInteractive
   * conditions above. Throws an error if no acceptable quiet window could be found before the end
   * of the trace.
   * @param {number} FMP
   * @param {number} traceEnd
   * @param {!Array<{start: number, end: number>}} longTasks
   * @return {number}
   */
  static findQuietWindow(FMP, traceEnd, longTasks) {
    // If we have an empty window at the very beginning, just return FMP early
    if (longTasks.length === 0 ||
        longTasks[0].start > FMP + FirstInteractive.getRequiredWindowSizeInMs(0)) {
      return FMP;
    }

    const isTooCloseToFMP = cluster => cluster.start < FMP + MIN_TASK_CLUSTER_FMP_DISTANCE;
    const isTooLong = cluster => cluster.duration > MAX_TASK_CLUSTER_DURATION;
    const isBadCluster = cluster => isTooCloseToFMP(cluster) || isTooLong(cluster);

    // FirstInteractive must start at the end of a long task, consider each long task and
    // examine the window that follows it.
    for (let i = 0; i < longTasks.length; i++) {
      const windowStart = longTasks[i].end;
      const windowSize = FirstInteractive.getRequiredWindowSizeInMs(windowStart - FMP);
      const windowEnd = windowStart + windowSize;

      // Check that we have a long enough trace
      if (windowEnd > traceEnd) {
        throw new Error(TRACE_BUSY_MSG);
      }

      // Check that this task isn't the beginning of a cluster
      if (i + 1 < longTasks.length &&
          longTasks[i + 1].start - windowStart <= MIN_TASK_CLUSTER_PADDING) {
        continue;
      }

      const taskClusters = FirstInteractive.getTaskClustersInWindow(longTasks, i + 1, windowEnd);
      const hasBadTaskClusters = taskClusters.some(isBadCluster);

      if (!hasBadTaskClusters) {
        return windowStart;
      }
    }

    throw new Error(TRACE_BUSY_MSG);
  }

  /**
   * @param {!TraceOfTabArtifact} traceOfTab
   * @return {{timeInMs: number, timestamp: number}}
   */
  computeWithArtifacts(traceOfTab) {
    const navStart = traceOfTab.timestamps.navigationStart;
    const FMP = traceOfTab.timings.firstMeaningfulPaint;
    const DCL = traceOfTab.timings.domContentLoaded;
    const traceEnd = traceOfTab.timings.traceEnd;

    if (traceEnd - FMP < MAX_QUIET_WINDOW_SIZE) {
      throw new Error('trace not at least 5 seconds longer than FMP');
    }

    if (!FMP || !DCL) {
      throw new Error(`No ${FMP ? 'domContentLoaded' : 'firstMeaningfulPaint'} event in trace`);
    }

    const longTasksAfterFMP = TracingProcessor.getMainThreadTopLevelEvents(traceOfTab, FMP)
        .filter(evt => evt.duration >= LONG_TASK_THRESHOLD);
    const firstInteractive = FirstInteractive.findQuietWindow(FMP, traceEnd, longTasksAfterFMP);

    const valueInMs = Math.max(firstInteractive, DCL);
    return {
      timeInMs: valueInMs,
      timestamp: (valueInMs + navStart) * 1000,
    };
  }

  /**
   * @param {!Trace} trace
   * @param {!ComputedArtifacts} artifacts
   * @return {{timeInMs: number, timestamp: number}}
   */
  compute_(trace, artifacts) {
    return artifacts.requestTraceOfTab(trace).then(traceOfTab => {
      return this.computeWithArtifacts(traceOfTab);
    });
  }
}

module.exports = FirstInteractive;
