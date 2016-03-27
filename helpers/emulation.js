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

// Nexus5X metrics adaparted from emulated_devices/module.json
const DEVICE_EMULATION_METRICS = {
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

const DEVICE_EMULATION_USERAGENT = {
  userAgent: 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36' +
    '(KHTML, like Gecko) Chrome/51.0.2690.0 Mobile Safari/537.36'
};

const NETWORK_THROTTLING_CONFIG = {
  latency: 150, // 150ms
  downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6Mbps
  uploadThroughput: 750 * 1024 / 8, // 750Kbps
  offline: false
};

function enableNexus5X(driver) {
  driver.sendCommand('Emulation.setDeviceMetricsOverride', DEVICE_EMULATION_METRICS);
  driver.sendCommand('Network.setUserAgentOverride', DEVICE_EMULATION_USERAGENT);
  driver.sendCommand('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    configuration: 'mobile'
  });

  // from emulation/TouchModel.js
  /* eslint-disable no-proto */ /* global window, document */
  const injectedFunction = function() {
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
  driver.sendCommand('Page.addScriptToEvaluateOnLoad', {
    scriptSource: '(' + injectedFunction.toString() + ')()'
  });
}

function disableCache(driver) {
  driver.sendCommand('Network.setCacheDisabled', {cacheDisabled: true});
}

function enableNetworkThrottling(driver) {
  driver.sendCommand('Network.emulateNetworkConditions', NETWORK_THROTTLING_CONFIG);
}

module.exports = {
  enableNexus5X: enableNexus5X,
  enableNetworkThrottling: enableNetworkThrottling,
  disableCache: disableCache
};
