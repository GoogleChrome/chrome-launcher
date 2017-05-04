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
 *  Afterwards, we report if the TTFI is less than 10 seconds.
 */

const Audit = require('./audit');
const Emulation = require('../lib/emulation');

const Formatter = require('../report/formatter');

// Maximum TTFI to be considered "fast" for PWA baseline checklist
//   https://developers.google.com/web/progressive-web-apps/checklist
const MAXIMUM_TTFI = 10 * 1000;

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
      requiredArtifacts: ['traces', 'networkRecords']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const networkRecords = artifacts.networkRecords[Audit.DEFAULT_PASS];
    const allRequestLatencies = networkRecords.map(record => {
      // Ignore requests that don't have timing data or resources that have
      // previously been requested and are coming from the cache.
      if (!record._timing || record._fromDiskCache || record._fromMemoryCache) {
        return undefined;
      }

      // Use DevTools' definition of Waiting latency: https://github.com/ChromeDevTools/devtools-frontend/blob/66595b8a73a9c873ea7714205b828866630e9e82/front_end/network/RequestTimingView.js#L164
      return record._timing.receiveHeadersEnd - record._timing.sendEnd;
    });

    const latency3gMin = Emulation.settings.TYPICAL_MOBILE_THROTTLING_METRICS.latency - 10;
    const areLatenciesAll3G = allRequestLatencies.every(val =>
        val === undefined || val > latency3gMin);

    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    return artifacts.requestFirstInteractive(trace).then(firstInteractive => {
      const timeToFirstInteractive = firstInteractive.timeInMs;
      const isFast = timeToFirstInteractive < MAXIMUM_TTFI;

      const extendedInfo = {
        formatter: Formatter.SUPPORTED_FORMATS.NULL,
        value: {areLatenciesAll3G, allRequestLatencies, isFast, timeToFirstInteractive}
      };

      if (!areLatenciesAll3G) {
        return {
          rawValue: false,
          // eslint-disable-next-line max-len
          debugString: `First Interactive was found at ${timeToFirstInteractive.toLocaleString()}, however, the network request latencies were not sufficiently realistic, so the performance measurements cannot be trusted.`,
          extendedInfo
        };
      }

      if (!isFast) {
        return {
          rawValue: false,
           // eslint-disable-next-line max-len
          debugString: `Under 3G conditions, First Interactive was at ${timeToFirstInteractive.toLocaleString()}. More details in the "Performance" section.`,
          extendedInfo
        };
      }

      return {
        rawValue: true,
        extendedInfo
      };
    });
  }
}

module.exports = LoadFastEnough4Pwa;
