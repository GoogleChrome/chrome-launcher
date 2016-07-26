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

const Audit = require('../../audits/time-to-interactive.js');
const SpeedlineGather = require('../../driver/gatherers/speedline');
const assert = require('assert');

const traceContents = require('../fixtures/traces/progressive-app.json');
const speedlineGather = new SpeedlineGather();

/* eslint-env mocha */
describe('Performance: time-to-interactive audit', () => {
  it('scores a -1 with invalid trace data', () => {
    return Audit.audit({
      traceContents: '[{"pid": 15256,"tid": 1295,"t',
      Speedline: {
        first: 500
      }
    }).then(output => {
      assert.equal(output.rawValue, -1);
      assert(output.debugString);
    });
  });

  it('evaluates valid input correctly', () => {
    let artifacts = {
      traceContents: traceContents
    };
    return speedlineGather.afterPass({}, artifacts).then(_ => {
      artifacts.Speedline = speedlineGather.artifact;
      return Audit.audit(artifacts).then(output => {
        assert.equal(output.rawValue, '1105.8');
        assert.equal(output.extendedInfo.value.expectedLatencyAtTTI, '20.72');
        assert.equal(output.extendedInfo.value.timings.fMP, '1099.5');
        assert.equal(output.extendedInfo.value.timings.mainThreadAvail, '1105.8');
        assert.equal(output.extendedInfo.value.timings.visuallyReady, '1105.8');
      });
    });
  });
});
