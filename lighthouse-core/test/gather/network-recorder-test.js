/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRecorder = require('../../lib/network-recorder');
const assert = require('assert');
const devtoolsLogItems = require('../fixtures/perflog.json');

/* eslint-env mocha */
describe('network recorder', function() {
  it('recordsFromLogs expands into records', function() {
    assert.equal(devtoolsLogItems.length, 555);
    const records = NetworkRecorder.recordsFromLogs(devtoolsLogItems);
    assert.equal(records.length, 76);
  });
});
