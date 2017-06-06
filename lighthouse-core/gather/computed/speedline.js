/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const speedline = require('speedline');

class Speedline extends ComputedArtifact {

  get name() {
    return 'Speedline';
  }

  /**
   * @return {!Promise}
   */
  compute_(trace, computedArtifacts) {
    // speedline() may throw without a promise, so we resolve immediately
    // to get in a promise chain.
    return computedArtifacts.requestTraceOfTab(trace).then(traceOfTab => {
      // Force use of nav start as reference point for speedline
      // See https://github.com/GoogleChrome/lighthouse/issues/2095
      const navStart = traceOfTab.timestamps.navigationStart * 1000;
      return speedline(trace.traceEvents, {
        timeOrigin: navStart,
        fastMode: true,
      });
    });
  }
}

module.exports = Speedline;
