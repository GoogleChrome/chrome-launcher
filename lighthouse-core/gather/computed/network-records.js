/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const NetworkRecorder = require('../../lib/network-recorder');

class NetworkRecords extends ComputedArtifact {
  get name() {
    return 'NetworkRecords';
  }

  /**
   * @param {!DevtoolsLog} devtoolsLog
   * @return {!Array<!WebInspector.NetworkRequest>} networkRecords
   */
  compute_(devtoolsLog) {
    return NetworkRecorder.recordsFromLogs(devtoolsLog);
  }
}

module.exports = NetworkRecords;
