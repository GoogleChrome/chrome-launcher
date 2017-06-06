/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Formatter = require('../report/formatter');

class UserTimings extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'user-timings',
      description: 'User Timing marks and measures',
      helpText: 'Consider instrumenting your app with the User Timing API to create custom, ' +
          'real-world measurements of key user experiences. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/user-timing).',
      requiredArtifacts: ['traces'],
      informative: true
    };
  }

  /**
   * @param {!Object} tabTrace
   * @return {!Array<!UserTimingsExtendedInfo>}
   */
  static filterTrace(tabTrace) {
    const userTimings = [];
    const measuresStartTimes = {};

    // Get all blink.user_timing events
    // The event phases we are interested in are mark and instant events (R, i, I)
    // and duration events which correspond to measures (B, b, E, e).
    // @see https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview#
    tabTrace.processEvents.filter(evt => {
      if (!evt.cat.includes('blink.user_timing')) {
        return false;
      }

      // reject these "userTiming" events that aren't really UserTiming, by nuking ones with frame data (or requestStart)
      // https://cs.chromium.org/search/?q=trace_event.*?user_timing&sq=package:chromium&type=cs
      return evt.name !== 'requestStart' &&
          evt.name !== 'navigationStart' &&
          evt.name !== 'paintNonDefaultBackgroundColor' &&
          evt.args.frame === undefined;
    })
    .forEach(ut => {
      // Mark events fall under phases R and I (or i)
      if (ut.ph === 'R' || ut.ph.toUpperCase() === 'I') {
        userTimings.push({
          name: ut.name,
          isMark: true,
          args: ut.args,
          startTime: ut.ts
        });

      // Beginning of measure event, keep track of this events start time
      } else if (ut.ph.toLowerCase() === 'b') {
        measuresStartTimes[ut.name] = ut.ts;

      // End of measure event
      } else if (ut.ph.toLowerCase() === 'e') {
        userTimings.push({
          name: ut.name,
          isMark: false,
          args: ut.args,
          startTime: measuresStartTimes[ut.name],
          endTime: ut.ts
        });
      }
    });

    // baseline the timestamps against navStart, and translate to milliseconds
    userTimings.forEach(ut => {
      ut.startTime = (ut.startTime - tabTrace.navigationStartEvt.ts) / 1000;
      if (!ut.isMark) {
        ut.endTime = (ut.endTime - tabTrace.navigationStartEvt.ts) / 1000;
        ut.duration = ut.endTime - ut.startTime;
      }
    });

    return userTimings;
  }

  /*
   * @return {!Array<string>}
   */
  static get blacklistedPrefixes() {
    return ['goog_'];
  }

  /**
   * We remove mark/measures entered by third parties not of interest to the user
   * @param {!UserTimingsExtendedInfo} artifacts
   * @return {boolean}
   */
  static excludeBlacklisted(timing) {
    return UserTimings.blacklistedPrefixes.every(prefix => !timing.name.startsWith(prefix));
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    return artifacts.requestTraceOfTab(trace).then(tabTrace => {
      const userTimings = this.filterTrace(tabTrace).filter(UserTimings.excludeBlacklisted);
      const tableRows = userTimings.map(item => {
        const time = item.isMark ? item.startTime : item.duration;
        return {
          name: item.name,
          timingType: item.isMark ? 'Mark' : 'Measure',
          time: time.toLocaleString() + ' ms',
          timeAsNumber: time,
        };
      }).sort((itemA, itemB) => {
        if (itemA.timingType === itemB.timingType) {
          // If both items are the same type, sort in ascending order by time
          return itemA.timeAsNumber - itemB.timeAsNumber;
        } else if (itemA.timingType === 'Measure') {
          // Put measures before marks
          return -1;
        } else {
          return 1;
        }
      });

      const headings = [
        {key: 'name', itemType: 'text', text: 'Name'},
        {key: 'timingType', itemType: 'text', text: 'Type'},
        {key: 'time', itemType: 'text', text: 'Time'},
      ];

      const details = Audit.makeV2TableDetails(headings, tableRows);

      return {
        // mark the audit as failed if there are user timings to display
        rawValue: userTimings.length === 0,
        displayValue: userTimings.length,
        extendedInfo: {
          formatter: Formatter.SUPPORTED_FORMATS.USER_TIMINGS,
          value: userTimings
        },
        details,
      };
    });
  }
}

module.exports = UserTimings;
