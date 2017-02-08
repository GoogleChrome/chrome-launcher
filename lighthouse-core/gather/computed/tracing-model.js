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

const ComputedArtifact = require('./computed-artifact');
const TracingProcessor = require('../../lib/traces/tracing-processor');

class TracingModel extends ComputedArtifact {

  get name() {
    return 'TracingModel';
  }

  /**
   * Return catapult traceviewer model
   * @param {{traceEvents: !Array}} trace
   * @return {!TracingProcessorModel}
   */
  compute_(trace) {
    const tracingProcessor = new TracingProcessor();
    return tracingProcessor.init(trace);
  }

}

module.exports = TracingModel;
