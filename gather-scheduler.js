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

class GatherScheduler {

  static runSeries(fns) {
    const args = Array.from(arguments).slice(1);

    return fns.reduce((prev, curr) => {
      return prev.then(_ => curr(...args));
    }, Promise.resolve());
  }

  static loadPage(driver, gatherers, options) {
    const loadPage = options.flags.loadPage;
    const url = options.url;

    if (loadPage) {
      return driver.gotoURL(url, driver.WAIT_FOR_LOADED);
    }

    return Promise.resolve();
  }

  static setupDriver(driver, gatherers, options) {
    return new Promise((resolve, reject) => {
      // Enable emulation.
      if (options.flags.emulateMobileDevice) {
        return resolve(driver.beginEmulation());
      }

      // noop if no mobile emulation
      resolve();
    }).then(_ => {
      return driver.cleanAndDisableBrowserCaches();
    }).then(_ => {
      // Force SWs to update on load.
      return driver.forceUpdateServiceWorkers();
    });
  }

  // Enable tracing and network record collection.
  static beginPassiveCollection(driver) {
    return driver.beginTrace().then(_ => {
      return driver.beginNetworkCollect();
    });
  }

  static endPassiveCollection(driver, gatherers, options, tracingData) {
    return driver.endNetworkCollect().then(networkRecords => {
      tracingData.networkRecords = networkRecords;
    }).then(_ => {
      return driver.endTrace();
    }).then(traceContents => {
      tracingData.traceContents = traceContents;
    });
  }

  static _phase(phaseName) {
    return function(driver, gatherers, options, tracingData) {
      return GatherScheduler._runPhase(gatherers, gatherer => {
        return gatherer[phaseName](options, tracingData);
      });
    };
  }

  static _runPhase(gatherers, gatherFun) {
    return gatherers.reduce((chain, gatherer) => {
      return chain.then(_ => gatherFun(gatherer));
    }, Promise.resolve());
  }

  static run(gatherers, options) {
    const driver = options.driver;
    const tracingData = {};
    const self = GatherScheduler;

    if (options.url === undefined || options.url === null) {
      throw new Error('You must provide a url to scheduler');
    }

    return GatherScheduler.runSeries([
      driver.connect.bind(driver),
      self.setupDriver,
      self._phase('setup'),
      self.beginPassiveCollection,
      self._phase('beforePageLoad'),
      self.loadPage,
      self._phase('afterPageLoad'),
      self.endPassiveCollection,
      self._phase('afterTraceCollected'),
      driver.disconnect.bind(driver),
      self._phase('tearDown')
    ], driver, gatherers, options, tracingData).then(_ => {
      // Collate all the gatherer results.
      return gatherers.map(g => g.artifact).concat(
        {networkRecords: tracingData.networkRecords},
        {traceContents: tracingData.traceContents}
      );
    });
  }
}

module.exports = GatherScheduler;
