/**
 * @license
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

const Audit = require('./audit');
const Formatter = require('../formatters/formatter');
const TimelineModel = require('../lib/traces/devtools-timeline-model');

const FAILURE_MESSAGE = 'Trace data not found.';

/**
 * @param {!Array<!Object>} traceData
 * @return {!Array<!UserTimingsExtendedInfo>}
 */
function filterTrace(traceData) {
  const userTimings = [];
  const measuresStartTimes = {};
  let traceStartFound = false;
  let navigationStartTime;

  // Fetch blink.user_timing events from the tracing data
  const timelineModel = new TimelineModel(traceData);
  const modeledTraceData = timelineModel.timelineModel();

  // Get all blink.user_timing events
  // The event phases we are interested in are mark and instant events (R, i, I)
  // and duration events which correspond to measures (B, b, E, e).
  // @see https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview#
  modeledTraceData.mainThreadEvents()
  .filter(ut => {
    if (ut.name === 'TracingStartedInPage' || ut.name === 'navigationStart') {
      return true;
    }

    if (ut.hasCategory('blink.user_timing')) {
      // reject these "userTiming" events that aren't really UserTiming, by nuking ones with frame data (or requestStart)
      // https://cs.chromium.org/search/?q=trace_event.*?user_timing&sq=package:chromium&type=cs
      return !(ut.name === 'requestStart' || ut.args.frame !== undefined);
    }

    return false;
  })
  .forEach(ut => {
    // Mark events fall under phases R and I (or i)
    if (ut.phase === 'R' || ut.phase.toUpperCase() === 'I') {
      // We only care about trace events that have to do with the page
      // Sometimes other frames can show up in the frame beforehand
      if (ut.name === 'TracingStartedInPage' && !traceStartFound) {
        traceStartFound = true;
        return;
      }

      // Once TraceingStartedInPage has begun, the next navigationStart event
      // marks the start of navigation
      // Make sure to not record such events hereafter
      if (ut.name === 'navigationStart' && traceStartFound && !navigationStartTime) {
        navigationStartTime = ut.startTime;
      }

      // Add user timings event to array
      if (ut.name !== 'navigationStart') {
        userTimings.push({
          name: ut.name,
          isMark: true,        // defines type of performance metric
          args: ut.args,
          startTime: ut.startTime
        });
      }
    } else if (ut.phase.toLowerCase() === 'b') {
      // Beginning of measure event, keep track of this events start time
      measuresStartTimes[ut.name] = ut.startTime;
    } else if (ut.phase.toLowerCase() === 'e') {
      // End of measure event
      // Add to the array of events
      userTimings.push({
        name: ut.name,
        isMark: false,
        args: ut.args,
        startTime: measuresStartTimes[ut.name],
        duration: ut.startTime - measuresStartTimes[ut.name],
        endTime: ut.startTime
      });
    }
  });

  userTimings.forEach(ut => {
    ut.startTime -= navigationStartTime;
    if (!ut.isMark) {
      ut.endTime -= navigationStartTime;
      ut.duration = ut.duration;
    }
  });

  return userTimings;
}

class UserTimings extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'user-timings',
      description: 'User Timing marks and measures',
      helpText: 'Consider instrumenting your app with the User Timing API to create custom, real-world measurements of key user experiences. <a href="https://developers.google.com/web/tools/lighthouse/audits/user-timing" target="_blank" rel="noreferrer noopener">Learn more</a>.',
      requiredArtifacts: ['traceContents']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    return new Promise((resolve, reject) => {
      const traceContents =
        artifacts.traces[this.DEFAULT_PASS] &&
        artifacts.traces[this.DEFAULT_PASS].traceEvents;
      if (!traceContents || !Array.isArray(traceContents)) {
        throw new Error(FAILURE_MESSAGE);
      }

      const userTimings = filterTrace(traceContents);
      resolve(UserTimings.generateAuditResult({
        rawValue: userTimings.length,
        extendedInfo: {
          formatter: Formatter.SUPPORTED_FORMATS.USER_TIMINGS,
          value: userTimings
        }
      }));
    }).catch(err => {
      return UserTimings.generateAuditResult({
        rawValue: -1,
        debugString: err.message
      });
    });
  }
}

module.exports = UserTimings;
