/**
 * Copyright 2017 Google Inc. All rights reserved.
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

const TracingModel = require('../../../gather/computed/tracing-model');

const assert = require('assert');
const pwaTrace = require('../../fixtures/traces/progressive-app.json');

/* eslint-env mocha */
describe('Tracing model computed artifact:', () => {
  it('gets a tracing model', () => {
    const tracingModel = new TracingModel();
    const model = tracingModel.compute_(pwaTrace);
    assert.ok(model instanceof global.tr.Model, 'return is not an instance of tr.Model');
  });
});
