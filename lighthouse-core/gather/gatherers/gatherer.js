/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Base class for all gatherers; defines pass lifecycle methods. The artifact
 * from the gatherer is the last not-undefined value returned by a lifecycle
 * method. All methods can return the artifact value directly or return a
 * Promise that resolves to that value.
 *
 * If an Error is thrown (or a Promise that rejects on an Error), the
 * GatherRunner will check for a `fatal` property on the Error. If not set to
 * `true`, the runner will treat it as an error internal to the gatherer and
 * continue execution of any remaining gatherers.
 */
class Gatherer {
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
   * @param {networkRecords: !Array, trace: {traceEvents: !Array}} loadData
   * @return {*|!Promise<*>}
   */
  afterPass(options, loadData) { }

  /* eslint-enable no-unused-vars */

}

module.exports = Gatherer;
