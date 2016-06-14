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

const Audit = require('../../audits/service-worker.js');
const assert = require('assert');

describe('Offline: Service Worker audit', () => {
  it('creates an output when given no Service Worker version', () => {
    const debugString = 'Error string';
    const output = Audit.audit({
      ServiceWorker: {
        version: undefined,
        debugString
      }
    });

    assert.equal(output.value, false);
    assert.equal(output.debugString, debugString);
  });

  it('creates an output when given an array of versions', () => {
    const output = Audit.audit({
      ServiceWorker: {
        version: {}
      }
    });

    return assert.equal(output.value, true);
  });
});
