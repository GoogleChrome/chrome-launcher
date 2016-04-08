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

  static _runPhase(gatherers, gatherFun) {
    return gatherers.reduce(
      (chain, gatherer) => chain.then(_ => gatherFun(gatherer)),
      Promise.resolve()
    );
  }

  static run(gatherers, options) {
    const driver = options.driver;
    const url = options.url;
    const tracingData = {};
    const artifacts = [];

    if (url === undefined || url === null) {
      throw new Error('You must provide a url to scheduler');
    }

    return driver.connect()
      .then(_ => this._runPhase(gatherers,
          gatherer => gatherer.setup(options)))
      .then(_ => driver.beginTrace())
      .then(_ => driver.beginNetworkCollect())

      .then(_ => this._runPhase(gatherers,
          gatherer => gatherer.beforePageLoad(options)))

      .then(_ => driver.gotoURL(url, driver.WAIT_FOR_LOADED))

      .then(_ => this._runPhase(gatherers,
          gatherer => gatherer.afterPageLoad(options)))
      .then(_ => driver.endNetworkCollect())
      .then(networkRecords => {
        tracingData.networkRecords = networkRecords;
      })
      .then(_ => driver.endTrace())
      .then(traceContents => {
        tracingData.traceContents = traceContents;
      })

      .then(_ => this._runPhase(gatherers,
          gatherer => gatherer.afterTraceCollected(options, tracingData)))
      .then(_ => driver.disconnect())

      .then(_ => this._runPhase(gatherers,
        gatherer => gatherer.tearDown(options, tracingData)))
      .then(_ => {
        artifacts.push(...gatherers.map(g => g.artifact));
        artifacts.push(
          {networkRecords: tracingData.networkRecords},
          {traceContents: tracingData.traceContents}
        );
      })
      .then(_ => artifacts);
  }
}

module.exports = GatherScheduler;
