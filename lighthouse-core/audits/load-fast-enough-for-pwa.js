/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @fileoverview
 *  This audit evaluates if a page's load performance is fast enough for it to be considered a PWA.
 *  We are doublechecking that the network requests were throttled (or slow on their own)
 *  Afterwards, we report if the TTFI is less than 10 seconds.
 */

const Audit = require('./audit');
const URL = require('../lib/url-shim');
const Emulation = require('../lib/emulation');
const Formatter = require('../report/formatter');
const Util = require('../report/v2/renderer/util.js');

// Maximum TTFI to be considered "fast" for PWA baseline checklist
//   https://developers.google.com/web/progressive-web-apps/checklist
const MAXIMUM_TTFI = 10 * 1000;

const WHITELISTED_STATUS_CODES = [307];

class LoadFastEnough4Pwa extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'PWA',
      name: 'load-fast-enough-for-pwa',
      description: 'Page load is fast enough on 3G',
      helpText: 'Satisfied if First Interactive is less than 10 seconds, as defined by the [PWA Baseline Checklist](https://developers.google.com/web/progressive-web-apps/checklist). Network throttling is required (specifically: RTT latencies >= 150 RTT are expected).',
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
      const firstRequestLatenciesByOrigin = new Map();
      networkRecords.forEach(record => {
        // Ignore requests that don't have valid origin, timing data, came from the cache, were
        // redirected by Chrome without going to the network, or are not finished.
        const fromCache = record._fromDiskCache || record._fromMemoryCache;
        const origin = URL.getOrigin(record._url);
        if (!origin || !record._timing || fromCache ||
            WHITELISTED_STATUS_CODES.includes(record.statusCode) || !record.finished) {
          return;
        }

        // Disregard requests with an invalid start time, (H2 request start times are sometimes less
        // than issue time and even negative which throws off timing)
        if (record._startTime < record._issueTime) {
          return;
        }

        // Use DevTools' definition of Waiting latency: https://github.com/ChromeDevTools/devtools-frontend/blob/66595b8a73a9c873ea7714205b828866630e9e82/front_end/network/RequestTimingView.js#L164
        const latency = record._timing.receiveHeadersEnd - record._timing.sendEnd;
        const latencyInfo = {
          url: record._url,
          startTime: record._startTime,
          origin,
          latency,
        };

        // Only examine the first request per origin to reduce noisiness from cases like H2 push
        // where individual request latency may not apply.
        const existing = firstRequestLatenciesByOrigin.get(origin);
        if (!existing || latencyInfo.startTime < existing.startTime) {
          firstRequestLatenciesByOrigin.set(origin, latencyInfo);
        }
      });

      let firstRequestLatencies = Array.from(firstRequestLatenciesByOrigin.values());
      const latency3gMin = Emulation.settings.TYPICAL_MOBILE_THROTTLING_METRICS.targetLatency - 10;
      const areLatenciesAll3G = firstRequestLatencies.every(val => val.latency > latency3gMin);
      firstRequestLatencies = firstRequestLatencies.map(item => ({
        url: item.url,
        latency: item.latency.toLocaleString(undefined, {maximumFractionDigits: 2})
      }));

      const trace = artifacts.traces[Audit.DEFAULT_PASS];
      return artifacts.requestFirstInteractive(trace).then(firstInteractive => {
        const timeToFirstInteractive = firstInteractive.timeInMs;
        const isFast = timeToFirstInteractive < MAXIMUM_TTFI;

        const extendedInfo = {
          formatter: Formatter.SUPPORTED_FORMATS.NULL,
          value: {areLatenciesAll3G, firstRequestLatencies, isFast, timeToFirstInteractive}
        };

        const details = Audit.makeV2TableDetails([
          {key: 'url', itemType: 'url', text: 'URL'},
          {key: 'latency', itemType: 'text', text: 'Latency (ms)'},
        ], firstRequestLatencies);

        if (!isFast) {
          return {
            rawValue: false,
            // eslint-disable-next-line max-len
            debugString: `First Interactive was at ${Util.formatMilliseconds(timeToFirstInteractive)}. More details in the "Performance" section.`,
            extendedInfo
          };
        }

        if (!areLatenciesAll3G) {
          return {
            rawValue: true,
            // eslint-disable-next-line max-len
            debugString: `First Interactive was found at ${Util.formatMilliseconds(timeToFirstInteractive)}, however, the network request latencies were not sufficiently realistic, so the performance measurements cannot be trusted.`,
            extendedInfo,
            details
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
