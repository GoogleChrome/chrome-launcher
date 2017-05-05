/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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

/** @fileoverview
 *  This audit evaluates if a page's load performance is fast enough for it to be considered a PWA.
 *  We are doublechecking that the network requests were throttled (or slow on their own)
 *  Afterwards, we report if the TTI is less than 10 seconds.
 */

const Audit = require('./audit');
const TTIMetric = require('./time-to-interactive');
const Emulation = require('../lib/emulation');

const Formatter = require('../report/formatter');

// Maximum TTI to be considered "fast" for PWA baseline checklist
//   https://developers.google.com/web/progressive-web-apps/checklist
const MAXIMUM_TTI = 10 * 1000;

class LoadFastEnough4Pwa extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'PWA',
      name: 'load-fast-enough-for-pwa',
      description: 'Page load is fast enough on 3G',
      helpText: 'Satisfied if the _Time To Interactive_ duration is shorter than _10 seconds_, as defined by the [PWA Baseline Checklist](https://developers.google.com/web/progressive-web-apps/checklist). Network throttling is required (specifically: RTT latencies >= 150 RTT are expected).',
      requiredArtifacts: ['traces', 'devtoolsLogs']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    return artifacts.requestNetworkRecords(devtoolsLogs).then(networkRecords => {
      const allRequestLatencies = networkRecords.map(record => {
        if (!record._timing) return undefined;
        // Use DevTools' definition of Waiting latency: https://github.com/ChromeDevTools/devtools-frontend/blob/66595b8a73a9c873ea7714205b828866630e9e82/front_end/network/RequestTimingView.js#L164
        return record._timing.receiveHeadersEnd - record._timing.sendEnd;
      });

      const latency3gMin = Emulation.settings.TYPICAL_MOBILE_THROTTLING_METRICS.latency - 10;
      const areLatenciesAll3G = allRequestLatencies.every(val =>
        val === undefined || val > latency3gMin);

      return TTIMetric.audit(artifacts).then(ttiResult => {
        const timeToInteractive = ttiResult.extendedInfo.value.timings.timeToInteractive;
        const isFast = timeToInteractive < MAXIMUM_TTI;

        const extendedInfo = {
          formatter: Formatter.SUPPORTED_FORMATS.NULL,
          value: {areLatenciesAll3G, allRequestLatencies, isFast, timeToInteractive}
        };

        if (!areLatenciesAll3G) {
          return {
            rawValue: false,
            // eslint-disable-next-line max-len
            debugString: `The Time To Interactive was found at ${ttiResult.displayValue}, however, the network request latencies were not sufficiently realistic, so the performance measurements cannot be trusted.`,
            extendedInfo
          };
        }

        if (!isFast) {
          return {
            rawValue: false,
            // eslint-disable-next-line max-len
            debugString: `Under 3G conditions, the Time To Interactive was at ${ttiResult.displayValue}. More details in the "Performance" section.`,
            extendedInfo
          };
        }

        return {
          rawValue: true,
          extendedInfo
        };
      });
    });
  }
}

module.exports = LoadFastEnough4Pwa;
