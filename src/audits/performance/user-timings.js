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

const Audit = require('../audit');
const Formatter = require('../../../formatters/formatter');
const TimelineModel = require('../../lib/traces/devtools-timeline-model');

const FAILURE_MESSAGE = 'Trace data not found.';

class UserTimings extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'user-timings',
      description: 'User Timing measures',
      requiredArtifacts: ['traceContents']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (!artifacts.traceContents || !Array.isArray(artifacts.traceContents)) {
      return UserTimings.generateAuditResult({
        value: -1,
        debugString: FAILURE_MESSAGE
      });
    }

    let timingsCount = 0;

    // Fetch blink.user_timing events from the tracing data
    const timelineModel = new TimelineModel(artifacts.traceContents);
    const modeledTraceData = timelineModel.timelineModel();
    const key = [...modeledTraceData.mainThreadAsyncEvents().keys()].find(
      key => key.title === 'User Timing'
    );
    let userTimings = modeledTraceData.mainThreadAsyncEvents().get(key);

    // Reduce events to record only useful information
    if (typeof userTimings !== 'undefined') {
      timingsCount = userTimings.length;
      userTimings = userTimings.map(ut => {
        return {
          name: ut.name,
          startTime: ut.startTime,
          endTime: ut.endTime,
          duration: ut.duration.toFixed(2) + 'ms',
          args: ut.args
        };
      });
    }

    return UserTimings.generateAuditResult({
      value: timingsCount,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.USER_TIMINGS,
        /* Pass empty array rather than undefined */
        value: userTimings || []
      }
    });
  }
}

module.exports = UserTimings;
