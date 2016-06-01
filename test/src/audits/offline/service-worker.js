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
const Audit = require('../../../../src/audits/offline/service-worker.js');
const assert = require('assert');

/* global describe, it*/

describe('Offline: Service Worker audit', () => {
  it('copes when it is given no Service Worker versions', () => {
    const output = Audit.audit({});

    return assert.equal(output.value, false);
  });

  it('creates an output when given an empty array', () => {
    const output = Audit.audit({
      serviceWorkers: {
        versions: []
      }
    });

    return assert.equal(output.value, false);
  });

  it('copes when given a value of -1', () => {
    const output = Audit.audit({
      serviceWorkers: {
        versions: -1
      }
    });

    return assert.equal(output.value, false);
  });

  it('creates an output when given an array of versions', () => {
    const output = Audit.audit({
      serviceWorkers: {
        versions: [{}]
      }
    });

    return assert.equal(output.value, true);
  });
});
