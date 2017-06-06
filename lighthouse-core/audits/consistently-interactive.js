/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util.js');
const TracingProcessor = require('../lib/traces/tracing-processor');
const Formatter = require('../report/formatter');

// Parameters (in ms) for log-normal CDF scoring. To see the curve:
//   https://www.desmos.com/calculator/uti67afozh
const SCORING_POINT_OF_DIMINISHING_RETURNS = 1700;
const SCORING_MEDIAN = 10000;

const REQUIRED_QUIET_WINDOW = 5000;
const ALLOWED_CONCURRENT_REQUESTS = 2;
const IGNORED_NETWORK_SCHEMES = ['data', 'ws'];

const distribution = TracingProcessor.getLogNormalDistribution(
  SCORING_MEDIAN,
  SCORING_POINT_OF_DIMINISHING_RETURNS
);

/**
 * @fileoverview This audit identifies the time the page is "consistently interactive".
 * Looks for the first period of at least 5 seconds after FMP where both CPU and network were quiet,
 * and returns the timestamp of the beginning of the CPU quiet period.
 * @see https://docs.google.com/document/d/1GGiI9-7KeY3TPqS3YT271upUVimo-XiL5mwWorDUD4c/edit#
 */
class ConsistentlyInteractiveMetric extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'consistently-interactive',
      description: 'Consistently Interactive (beta)',
      helpText: 'The point at which most network resources have finished loading and the ' +
          'CPU is idle for a prolonged period.',
      scoringMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces', 'devtoolsLogs']
    };
  }

  /**
   * Finds all time periods where the number of inflight requests is less than or equal to the
   * number of allowed concurrent requests (2).
   * @param {!Array<!WebInspector.NetworkRequest>} networkRecords
   * @param {{timestamps: {traceEnd: number}}} traceOfTab
   * @return {!Array<!TimePeriod>}
   */
  static _findNetworkQuietPeriods(networkRecords, traceOfTab) {
    const traceEnd = traceOfTab.timestamps.traceEnd;

    // First collect the timestamps of when requests start and end
    const timeBoundaries = [];
    networkRecords.forEach(record => {
      const scheme = record.parsedURL && record.parsedURL.scheme;
      if (IGNORED_NETWORK_SCHEMES.includes(scheme)) {
        return;
      }

      // convert the network record timestamp to ms to line-up with traceOfTab
      timeBoundaries.push({time: record.startTime * 1000, isStart: true});
      if (record.finished) {
        timeBoundaries.push({time: record.endTime * 1000, isStart: false});
      }
    });

    timeBoundaries.sort((a, b) => a.time - b.time);

    let numInflightRequests = 0;
    let quietPeriodStart = 0;
    const quietPeriods = [];
    timeBoundaries.forEach(boundary => {
      if (boundary.isStart) {
        // we've just started a new request. are we exiting a quiet period?
        if (numInflightRequests === ALLOWED_CONCURRENT_REQUESTS) {
          quietPeriods.push({start: quietPeriodStart, end: boundary.time});
        }
        numInflightRequests++;
      } else {
        numInflightRequests--;
        // we've just completed a request. are we entering a quiet period?
        if (numInflightRequests === ALLOWED_CONCURRENT_REQUESTS) {
          quietPeriodStart = boundary.time;
        }
      }
    });

    // Check if the trace ended in a quiet period
    if (numInflightRequests <= ALLOWED_CONCURRENT_REQUESTS) {
      quietPeriods.push({start: quietPeriodStart, end: traceEnd});
    }

    return quietPeriods;
  }

  /**
   * Finds all time periods where there are no long tasks.
   * @param {!Array<!TimePeriod>} longTasks
   * @param {{timestamps: {navigationStart: number, traceEnd: number}}} traceOfTab
   * @return {!Array<!TimePeriod>}
   */
  static _findCPUQuietPeriods(longTasks, traceOfTab) {
    const navStartTsInMs = traceOfTab.timestamps.navigationStart;
    const traceEndTsInMs = traceOfTab.timestamps.traceEnd;
    if (longTasks.length === 0) {
      return [{start: 0, end: traceEndTsInMs}];
    }

    const quietPeriods = [];
    longTasks.forEach((task, index) => {
      if (index === 0) {
        quietPeriods.push({
          start: 0,
          end: task.start + navStartTsInMs,
        });
      }

      if (index === longTasks.length - 1) {
        quietPeriods.push({
          start: task.end + navStartTsInMs,
          end: traceEndTsInMs,
        });
      } else {
        quietPeriods.push({
          start: task.end + navStartTsInMs,
          end: longTasks[index + 1].start + navStartTsInMs,
        });
      }
    });

    return quietPeriods;
  }

  /**
   * Finds the first time period where a network quiet period and a CPU quiet period overlap.
   * @param {!Array<!TimePeriod>} longTasks
   * @param {!Array<!WebInspector.NetworkRequest>} networkRecords
   * @param {{timestamps: {navigationStart: number, firstMeaningfulPaint: number,
   *    traceEnd: number}}} traceOfTab
   * @return {{cpuQuietPeriod: !TimePeriod, networkQuietPeriod: !TimePeriod,
   *    cpuQuietPeriods: !Array<!TimePeriod>, networkQuietPeriods: !Array<!TimePeriod>}}
   */
  static findOverlappingQuietPeriods(longTasks, networkRecords, traceOfTab) {
    const FMPTsInMs = traceOfTab.timestamps.firstMeaningfulPaint;

    const isLongEnoughQuietPeriod = period =>
        period.end > FMPTsInMs + REQUIRED_QUIET_WINDOW &&
        period.end - period.start >= REQUIRED_QUIET_WINDOW;
    const networkQuietPeriods = this._findNetworkQuietPeriods(networkRecords, traceOfTab)
        .filter(isLongEnoughQuietPeriod);
    const cpuQuietPeriods = this._findCPUQuietPeriods(longTasks, traceOfTab)
        .filter(isLongEnoughQuietPeriod);

    const cpuQueue = cpuQuietPeriods.slice();
    const networkQueue = networkQuietPeriods.slice();

    // We will check for a CPU quiet period contained within a Network quiet period or vice-versa
    let cpuCandidate = cpuQueue.shift();
    let networkCandidate = networkQueue.shift();
    while (cpuCandidate && networkCandidate) {
      if (cpuCandidate.start >= networkCandidate.start) {
        // CPU starts later than network, window must be contained by network or we check the next
        if (networkCandidate.end >= cpuCandidate.start + REQUIRED_QUIET_WINDOW) {
          return {
            cpuQuietPeriod: cpuCandidate,
            networkQuietPeriod: networkCandidate,
            cpuQuietPeriods,
            networkQuietPeriods,
          };
        } else {
          networkCandidate = networkQueue.shift();
        }
      } else {
        // Network starts later than CPU, window must be contained by CPU or we check the next
        if (cpuCandidate.end >= networkCandidate.start + REQUIRED_QUIET_WINDOW) {
          return {
            cpuQuietPeriod: cpuCandidate,
            networkQuietPeriod: networkCandidate,
            cpuQuietPeriods,
            networkQuietPeriods,
          };
        } else {
          cpuCandidate = cpuQueue.shift();
        }
      }
    }

    const culprit = cpuCandidate ? 'Network' : 'Main thread';
    throw new Error(`${culprit} activity continued through the end of the trace recording. ` +
      'Consistently Interactive requires a minimum of 5 seconds of both main thread idle and ' +
      'network idle.');
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!Promise<!AuditResult>}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const computedArtifacts = [
      artifacts.requestNetworkRecords(devtoolsLog),
      artifacts.requestTraceOfTab(trace),
    ];

    return Promise.all(computedArtifacts)
      .then(([networkRecords, traceOfTab]) => {
        if (!traceOfTab.timestamps.firstMeaningfulPaint) {
          throw new Error('No firstMeaningfulPaint found in trace.');
        }

        if (!traceOfTab.timestamps.domContentLoaded) {
          throw new Error('No domContentLoaded found in trace.');
        }

        const longTasks = TracingProcessor.getMainThreadTopLevelEvents(traceOfTab)
            .filter(event => event.duration >= 50);
        const quietPeriodInfo = this.findOverlappingQuietPeriods(longTasks, networkRecords,
            traceOfTab);
        const cpuQuietPeriod = quietPeriodInfo.cpuQuietPeriod;

        const timestamp = Math.max(
          cpuQuietPeriod.start,
          traceOfTab.timestamps.firstMeaningfulPaint,
          traceOfTab.timestamps.domContentLoaded
        ) * 1000;
        const timeInMs = (timestamp - traceOfTab.timestamps.navigationStart * 1000) / 1000;
        const extendedInfo = Object.assign(quietPeriodInfo, {timestamp, timeInMs});

        let score = 100 * distribution.computeComplementaryPercentile(timeInMs);
        // Clamp the score to 0 <= x <= 100.
        score = Math.min(100, score);
        score = Math.max(0, score);
        score = Math.round(score);

        return {
          score,
          rawValue: timeInMs,
          displayValue: Util.formatMilliseconds(timeInMs),
          optimalValue: this.meta.optimalValue,
          extendedInfo: {
            value: extendedInfo,
            formatter: Formatter.SUPPORTED_FORMATS.NULL,
          }
        };
      });
  }
}

module.exports = ConsistentlyInteractiveMetric;

/**
 * @typedef {{
 *     start: number,
 *     end: number,
 * }}
 */
let TimePeriod; // eslint-disable-line no-unused-vars
