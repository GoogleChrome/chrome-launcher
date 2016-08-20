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

const SpeedlineGather = require('../../../gather/computed/speedline.js');
const assert = require('assert');
const pwaTrace = require('../../fixtures/traces/progressive-app.json');

describe('Speedline gatherer', () => {
  it('returns an error debugString on faulty trace data', () => {
    const speedlineGather = new SpeedlineGather();

    return speedlineGather.request({traceEvents: {boo: 'ya'}}).then(_ => {
      assert.fail(true, true, 'Invalid trace did not throw exception in speedline');
    }, err => {
      assert.ok(err);
      assert.ok(err.message.length);
    });
  });

  // TODO(samthor): speedIndex requires trace data with frame data. Include multiple short samples.
  it('measures the pwa.rocks example with speed index of 831', () => {
    const speedlineGather = new SpeedlineGather();

    return speedlineGather.request({traceEvents: pwaTrace}).then(speedline => {
      return assert.equal(Math.round(speedline.speedIndex), 831);
    });
  });

  it('uses a cache', () => {
    // TODO these gather instances could be shared across tests for speed
    const speedlineGather = new SpeedlineGather();
    let start;
    const trace = {traceEvents: pwaTrace};
    // repeat with the same input data twice
    return Promise.resolve()
      .then(_ => speedlineGather.request(trace))
      .then(_ => {
        start = Date.now();
      })
      .then(_ => speedlineGather.request(trace))
      .then(speedline => {
        // on a MacBook Air, one run is  1000-1500ms
        assert.ok(Date.now() - start < 50, 'Quick results come from the cache');

        assert.ok(speedlineGather.cache.has(trace), 'Cache reports a match');
        assert.equal(speedlineGather.cache.get(trace), speedline, 'Cache match matches');

        return assert.equal(Math.round(speedline.speedIndex), 831);
      });
  });
});
