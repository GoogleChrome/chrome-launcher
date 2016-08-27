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

/**
 * Base class for all gatherers; defines pass lifecycle methods.
 */
class Gatherer {

  constructor() {
    this.artifact = {};
  }

  /**
   * @return {string}
   */
  get name() {
    return this.constructor.name;
  }

  /* eslint-disable no-unused-vars */

  /**
   * Called before navigation to target url.
   * @param {!Object} options
   */
  beforePass(options) { }

  /**
   * Called after target page is loaded. If a trace is enabled for this pass,
   * the trace is still being recorded.
   * @param {!Object} options
   */
  pass(options) { }

  /**
   * Called after target page is loaded, all gatherer `pass` methods have been
   * executed, and — if generated in this pass — the trace is ended. The trace
   * and record of network activity are provided in `loadData`.
   * @param {!Object} options
   * @param {{networkRecords: !Array, trace: {traceEvents: !Array}} loadData
   */
  afterPass(options, loadData) { }

  /* eslint-enable no-unused-vars */

}

module.exports = Gatherer;
