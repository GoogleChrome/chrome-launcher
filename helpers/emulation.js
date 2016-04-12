/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/**
 * Nexus 5X metrics adapted from emulated_devices/module.json
 */
const NEXUS5X_EMULATION_METRICS = {
  mobile: true,
  screenWidth: 412,
  screenHeight: 732,
  width: 412,
  height: 732,
  positionX: 0,
  positionY: 0,
  scale: 1,
  deviceScaleFactor: 2.625,
  fitWindow: false,
  screenOrientation: {
    angle: 0,
    type: 'portraitPrimary'
  }
};

const NEXUS5X_USERAGENT = {
  userAgent: 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36' +
    '(KHTML, like Gecko) Chrome/51.0.2690.0 Mobile Safari/537.36'
};

const TYPICAL_MOBILE_THROTTLING_METRICS = {
  latency: 150, // 150ms
  downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6Mbps
  uploadThroughput: 750 * 1024 / 8, // 750Kbps
  offline: false
};

function enableNexus5X(driver) {
  /**
   * Finalizes touch emulation by enabling `"ontouchstart" in window` feature detect
   * to work. Messy hack, though copied verbatim from DevTools' emulation/TouchModel.js
   * where it's been working for years. addScriptToEvaluateOnLoad runs before any of the
   * page's JavaScript executes.
   */
  /* eslint-disable no-proto */ /* global window, document */
  const injectedTouchEventsFunction = function() {
    const touchEvents = ['ontouchstart', 'ontouchend', 'ontouchmove', 'ontouchcancel'];
    var recepients = [window.__proto__, document.__proto__];
    for (var i = 0; i < touchEvents.length; ++i) {
      for (var j = 0; j < recepients.length; ++j) {
        if (!(touchEvents[i] in recepients[j])) {
          Object.defineProperty(recepients[j], touchEvents[i], {
            value: null, writable: true, configurable: true, enumerable: true
          });
        }
      }
    }
  };
  /* eslint-enable */

  return Promise.all([
    driver.sendCommand('Emulation.setDeviceMetricsOverride', NEXUS5X_EMULATION_METRICS),
    driver.sendCommand('Network.setUserAgentOverride', NEXUS5X_USERAGENT),
    driver.sendCommand('Emulation.setTouchEmulationEnabled', {
      enabled: true,
      configuration: 'mobile'
    }),
    driver.sendCommand('Page.addScriptToEvaluateOnLoad', {
      scriptSource: '(' + injectedTouchEventsFunction.toString() + ')()'
    })
  ]);
}

function enableNetworkThrottling(driver) {
  return driver.sendCommand('Network.emulateNetworkConditions', TYPICAL_MOBILE_THROTTLING_METRICS);
}

module.exports = {
  enableNexus5X,
  enableNetworkThrottling
};
