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

const Audit = require('../../../src/audits/speed-index-metric.js');
const assert = require('assert');

describe('Performance: speed-index-metric audit', () => {
  function frame(timestamp, progress) {
    timestamp = timestamp || 0;
    progress = progress || 0;

    return {
      getTimeStamp: () => timestamp,
      getProgress: () => progress
    };
  }

  it('passes on errors from gatherer', () => {
    const debugString = 'Real emergency here.';
    return Audit.audit({Speedline: {debugString}}).then(response => {
      assert.equal(response.value, -1);
      assert.equal(response.debugString, debugString);
    });
  });

  it('gives error string if no frames', () => {
    const artifacts = {Speedline: {frames: []}};
    return Audit.audit(artifacts).then(response => {
      assert.equal(response.value, -1);
      assert(response.debugString);
    });
  });

  it('gives error string if too few frames to determine speed index', () => {
    const artifacts = {Speedline: {frames: [frame()]}};
    return Audit.audit(artifacts).then(response => {
      assert.equal(response.value, -1);
      assert(response.debugString);
    });
  });

  it('gives error string if speed index of 0', () => {
    const Speedline = {
      frames: [frame(), frame(), frame()],
      speedIndex: 0
    };

    return Audit.audit({Speedline}).then(response => {
      assert.equal(response.value, -1);
      assert(response.debugString);
    });
  });

  it('scores speed index of 831 as 100', () => {
    const Speedline = {
      frames: [frame(), frame(), frame()],
      speedIndex: 831
    };

    return Audit.audit({Speedline}).then(response => {
      assert.equal(response.rawValue, 831);
      assert.equal(response.value, 100);
    });
  });
});
