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

const Audit = require('../../audits/speed-index-metric.js');
const assert = require('assert');

const emptyTraceStub = {
  traces: {
    defaultPass: {}
  }
};

function mockArtifactsWithSpeedlineResult(result) {
  const mockArtifacts = {
    requestSpeedline: function() {
      return Promise.resolve(result);
    }
  };
  return Object.assign({}, emptyTraceStub, mockArtifacts);
}

describe('Performance: speed-index-metric audit', () => {
  function frame(timestamp, progress) {
    timestamp = timestamp || 0;
    progress = progress || 0;

    return {
      getTimeStamp: () => timestamp,
      getProgress: () => progress,
      getPerceptualProgress: () => progress
    };
  }

  it.skip('passes on errors from gatherer', () => {
    const debugString = 'Real emergency here.';
    const mockArtifacts = mockArtifactsWithSpeedlineResult();
    return Audit.audit(mockArtifacts).then(response => {
      assert.equal(response.rawValue, -1);
      assert.equal(response.debugString, debugString);
    });
  });

  it('gives error string if no frames', () => {
    const artifacts = mockArtifactsWithSpeedlineResult({frames: []});
    return Audit.audit(artifacts).then(response => {
      assert.equal(response.rawValue, -1);
      assert(response.debugString);
    });
  });

  it('gives error string if speed index of 0', () => {
    const SpeedlineResult = {
      frames: [frame(), frame(), frame()],
      speedIndex: 0
    };
    const artifacts = mockArtifactsWithSpeedlineResult(SpeedlineResult);

    return Audit.audit(artifacts).then(response => {
      assert.equal(response.rawValue, -1);
      assert(response.debugString);
    });
  });

  it('scores speed index of 831 as 100', () => {
    const SpeedlineResult = {
      frames: [frame(), frame(), frame()],
      first: 630,
      complete: 930,
      speedIndex: 831,
      perceptualSpeedIndex: 845
    };
    const artifacts = mockArtifactsWithSpeedlineResult(SpeedlineResult);

    return Audit.audit(artifacts).then(response => {
      assert.equal(response.displayValue, '845');
      assert.equal(response.rawValue, 845);
      assert.equal(response.extendedInfo.value.timings.firstVisualChange, 630);
      assert.equal(response.extendedInfo.value.timings.visuallyComplete, 930);
      assert.equal(response.extendedInfo.value.timings.speedIndex, 831);
      assert.equal(response.extendedInfo.value.timings.perceptualSpeedIndex, 845);
    });
  });
});
