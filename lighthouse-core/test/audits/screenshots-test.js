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

const Audit = require('../../audits/screenshots.js');
const GatherRunner = require('../../gather/gather-runner.js');
const assert = require('assert');

const pwaTrace = require('../fixtures/traces/progressive-app.json');

const mockArtifacts = GatherRunner.instantiateComputedArtifacts();
mockArtifacts.traces = {
  defaultPass: {traceEvents: pwaTrace}
};

/* eslint-env mocha */
describe('Performance: screenshots audit', () => {
  // TODO: this is a bad test.
  it.skip('processes an empty trace for screenshot data', () => {
    return Audit.audit(mockArtifacts).then(output => {
      assert.equal(output.score, 0);
    });
  });
});
