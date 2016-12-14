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

const Audit = require('../../audits/service-worker.js');
const assert = require('assert');

/* eslint-env mocha */

describe('Offline: Service Worker audit', () => {
  it('reports driver error when given no Service Worker versions', () => {
    const debugString = 'Error string';
    const output = Audit.audit({
      ServiceWorker: {
        debugString
      }
    });

    assert.equal(output.score, false);
    assert.equal(output.rawValue, false);
    assert.equal(output.debugString, debugString);
  });

  it('passes when given a matching Service Worker version', () => {
    const output = Audit.audit({
      ServiceWorker: {
        versions: [{
          status: 'activated',
          scriptURL: 'https://example.com/sw.js'
        }]
      },
      URL: {finalUrl: 'https://example.com'}
    });

    assert.equal(output.score, true);
    assert.equal(output.rawValue, true);
  });

  it('discards service worker registrations for other origins', () => {
    const versions = [{
      status: 'activated',
      scriptURL: 'https://other-example.com'
    }];

    const output = Audit.audit({
      ServiceWorker: {
        versions
      },
      URL: {finalUrl: 'https://example.com'}
    });

    assert.equal(output.score, false);
    assert.equal(output.rawValue, false);
    assert.ok(output.debugString);
  });
});
