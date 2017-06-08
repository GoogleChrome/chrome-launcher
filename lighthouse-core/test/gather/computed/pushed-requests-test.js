/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const Runner = require('../../../runner.js');
const mockNetworkRecords = require('../../fixtures/networkRecords-h2push.json');

const assert = require('assert');

describe('PushedRequests computed artifact', () => {
  it('filters networkRecords down to the pushed ones', () => {
    const computedArtifacts = Runner.instantiateComputedArtifacts();
    computedArtifacts.requestNetworkRecords = _ => Promise.resolve(mockNetworkRecords);

    return computedArtifacts.requestPushedRequests({}).then(records => {
      assert.ok(records.length < mockNetworkRecords.length, 'We filtered out the non-push records');
      assert.equal(records.length, 3, 'There are 3 pushed responses in the recording');
      return;
    });
  });
});
