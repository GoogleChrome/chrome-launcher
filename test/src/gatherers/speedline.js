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

const SpeedlineGather = require('../../../src/gatherers/speedline.js');
const assert = require('assert');

describe('Speedline gatherer', () => {
  it('scores a -1 when faulty trace data is present', () => {
    const speedlineGather = new SpeedlineGather();

    return speedlineGather.afterPass({}, {traceContents: {boo: 'ya'}}).then(_ => {
      return assert(speedlineGather.artifact.debugString);
    });
  });

  // TODO(samthor): speedIndex requires trace data with frame data. Include multiple short samples.
  it('measures the pwa.rocks example with speed index of 831', () => {
    const speedlineGather = new SpeedlineGather();
    const traceContents = require('../../fixtures/traces/progressive-app.json');

    return speedlineGather.afterPass({}, {traceContents}).then(_ => {
      const speedline = speedlineGather.artifact;
      return assert.equal(Math.round(speedline.speedIndex), 831);
    });
  });
});
