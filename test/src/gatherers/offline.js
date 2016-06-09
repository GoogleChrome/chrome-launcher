/**
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

/* eslint-env mocha */

const OfflineGather = require('../../../src/gatherers/offline');
const assert = require('assert');
let offlineGather;

describe('HTTP Redirect gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    offlineGather = new OfflineGather();
  });

  it('returns an artifact', () => {
    return offlineGather.afterPass({
      driver: {
        sendCommand() {
          return Promise.resolve();
        },
        evaluateAsync() {
          return Promise.resolve({offlineResponseCode: 200});
        }
      }
    }).then(_ => {
      assert.deepEqual(offlineGather.artifact, {offlineResponseCode: 200});
    });
  });

  it('handles driver sendCommand() failure', () => {
    return offlineGather.afterPass({
      driver: {
        sendCommand() {
          return Promise.reject('such a fail');
        }
      }
    }).then(_ => {
      assert(false);
    }).catch(_ => {
      assert.deepEqual(offlineGather.artifact, {offlineResponseCode: -1});
    });
  });

  it('handles driver evaluateAsync() failure', () => {
    return offlineGather.afterPass({
      driver: {
        sendCommand() {
          return Promise.resolve();
        },
        evaluateAsync() {
          return Promise.reject();
        }
      }
    }).then(_ => {
      assert(false);
    }).catch(_ => {
      assert.deepEqual(offlineGather.artifact, {offlineResponseCode: -1});
    });
  });
});
