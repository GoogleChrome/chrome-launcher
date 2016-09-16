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

const ComputedArtifact = require('./computed-artifact');
const speedline = require('speedline');
const ConsoleQuieter = require('../../lib/console-quieter');

class Speedline extends ComputedArtifact {

  get name() {
    return 'Speedline';
  }

  /**
   * @return {!Promise}
   */
  request(trace) {
    if (this.cache.has(trace)) {
      return this.cache.get(trace);
    }

    // speedline() may throw without a promise, so we resolve immediately
    // to get in a promise chain.
    return Promise.resolve().then(_ => {
      ConsoleQuieter.mute({prefix: 'speedline'});
      return speedline(trace.traceEvents);
    }).then(speedlineResults => {
      ConsoleQuieter.unmuteAndFlush();
      this.cache.set(trace, speedlineResults);
      return speedlineResults;
    });
  }
}

module.exports = Speedline;
