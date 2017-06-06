/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const assert = require('assert');
const pwaTrace = require('../../fixtures/traces/progressive-app.json');
const threeFrameTrace = require('../../fixtures/traces/threeframes-blank_content_more.json');
const Runner = require('../../../runner.js');

describe('Speedline gatherer', () => {
  let computedArtifacts;

  beforeEach(() => {
    computedArtifacts = Runner.instantiateComputedArtifacts();
  });

  it('returns an error debugString on faulty trace data', () => {
    return computedArtifacts.requestSpeedline({traceEvents: {boo: 'ya'}}).then(_ => {
      assert.fail(true, true, 'Invalid trace did not throw exception in speedline');
    }, err => {
      assert.ok(err);
      assert.ok(err.message.length);
    });
  });

  it('measures the pwa.rocks example with speed index of 577', () => {
    return computedArtifacts.requestSpeedline({traceEvents: pwaTrace}).then(speedline => {
      return assert.equal(Math.floor(speedline.speedIndex), 561);
    });
  });

  it('measures SI of 3 frame trace (blank @1s, content @2s, more content @3s)', () => {
    return computedArtifacts.requestSpeedline(threeFrameTrace).then(speedline => {
      assert.equal(Math.floor(speedline.speedIndex), 2040);
      return assert.equal(Math.floor(speedline.perceptualSpeedIndex), 2030);
    });
  });

  it('uses a cache', () => {
    let start;
    let firstResult;
    const trace = {traceEvents: pwaTrace};
    // repeat with the same input data twice
    return Promise.resolve()
      .then(_ => computedArtifacts.requestSpeedline(trace))
      .then(result => {
        start = Date.now();
        firstResult = result;
      })
      .then(_ => computedArtifacts.requestSpeedline(trace))
      .then(speedline => {
        // on a MacBook Air, one run is  1000-1500ms
        assert.ok(Date.now() - start < 50, 'Quick results come from the cache');
        assert.equal(firstResult, speedline, 'Cache match matches');

        return assert.equal(Math.floor(speedline.speedIndex), 561);
      });
  });
});
