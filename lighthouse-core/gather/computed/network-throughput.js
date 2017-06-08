/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');

class NetworkThroughput extends ComputedArtifact {
  get name() {
    return 'NetworkThroughput';
  }

  /**
   * Computes the average throughput for the given records in bytes/second.
   * Excludes data URI, failed or otherwise incomplete, and cached requests.
   * Returns Infinity if there were no analyzable network records.
   *
   * @param {!Array<!WebInspector.NetworkRequest>} networkRecords
   * @return {number}
   */
  static getThroughput(networkRecords) {
    let totalBytes = 0;
    const timeBoundaries = networkRecords.reduce((boundaries, record) => {
      const scheme = record.parsedURL && record.parsedURL.scheme;
      if (scheme === 'data' || record.failed || !record.finished ||
          record.statusCode > 300 || !record.transferSize) {
        return boundaries;
      }

      totalBytes += record.transferSize;
      boundaries.push({time: record.responseReceivedTime, isStart: true});
      boundaries.push({time: record.endTime, isStart: false});
      return boundaries;
    }, []).sort((a, b) => a.time - b.time);

    if (!timeBoundaries.length) {
      return Infinity;
    }

    let inflight = 0;
    let currentStart = 0;
    let totalDuration = 0;
    timeBoundaries.forEach(boundary => {
      if (boundary.isStart) {
        if (inflight === 0) {
          currentStart = boundary.time;
        }
        inflight++;
      } else {
        inflight--;
        if (inflight === 0) {
          totalDuration += boundary.time - currentStart;
        }
      }
    });

    return totalBytes / totalDuration;
  }

  /**
   * @param {!DevtoolsLog} devtoolsLog
   * @param {!ComputedArtifacts} artifacts
   * @return {!Promise<!Object>}
   */
  compute_(devtoolsLog, artifacts) {
    return artifacts.requestNetworkRecords(devtoolsLog)
      .then(NetworkThroughput.getThroughput);
  }
}

module.exports = NetworkThroughput;
