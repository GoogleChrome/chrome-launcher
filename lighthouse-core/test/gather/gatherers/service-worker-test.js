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

const ServiceWorkerGather = require('../../../gather/gatherers/service-worker');
const assert = require('assert');
let serviceWorkerGatherer;

describe('Service Worker gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    serviceWorkerGatherer = new ServiceWorkerGather();
  });

  it('obtains the active service worker registration', () => {
    const url = 'https://example.com/';
    const versions = [{
      status: 'activated',
      scriptURL: url
    }];

    return serviceWorkerGatherer.beforePass({
      driver: {
        getServiceWorkerVersions() {
          return Promise.resolve({versions});
        }
      },
      url
    }).then(artifact => {
      assert.deepEqual(artifact.versions, versions);
    });
  });

  it('handles driver failure', () => {
    return serviceWorkerGatherer.beforePass({
      driver: {
        getServiceWorkerVersions() {
          return Promise.reject('fail');
        }
      }
    }).then(artifact => {
      assert.ok(!artifact.versions);
      assert.ok(artifact.debugString);
    });
  });
});
