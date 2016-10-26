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

const ManifestGather = require('../../../gather/gatherers/manifest');
const assert = require('assert');
let manifestGather;

const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';

describe('Manifest gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    manifestGather = new ManifestGather();
  });

  it('returns an artifact', () => {
    return manifestGather.afterPass({
      driver: {
        sendCommand() {
          return Promise.resolve({
            data: '{}',
            errors: [],
            url: EXAMPLE_MANIFEST_URL
          });
        }
      },
      url: EXAMPLE_DOC_URL
    }).then(_ => {
      assert.ok(typeof manifestGather.artifact === 'object');
    });
  });

  it('propagates error from driver failure', () => {
    const error = 'There was an error.';
    return manifestGather.afterPass({
      driver: {
        sendCommand() {
          return Promise.reject(error);
        }
      }
    }).then(_ => {
      assert.ok(manifestGather.artifact.debugString);
      assert.notStrictEqual(manifestGather.artifact.debugString.indexOf(error), -1);
    });
  });

  it('emits an error when unable to retrieve the manifest', () => {
    return manifestGather.afterPass({
      driver: {
        sendCommand() {
          return Promise.resolve({
            errors: [],
            url: EXAMPLE_MANIFEST_URL
          });
        }
      }
    }).then(_ => {
      assert.ok(manifestGather.artifact.debugString);
    });
  });

  it('emits an error when there was no manifest', () => {
    return manifestGather.afterPass({
      driver: {
        sendCommand() {
          return Promise.resolve({
            data: '',
            errors: [],
            url: ''
          });
        }
      }
    }).then(_ => {
      assert.ok(manifestGather.artifact.debugString);
    });
  });

  it('creates a manifest object for valid manifest content', () => {
    const data = JSON.stringify({
      name: 'App'
    });
    return manifestGather.afterPass({
      driver: {
        sendCommand() {
          return Promise.resolve({
            errors: [],
            data,
            url: EXAMPLE_MANIFEST_URL
          });
        }
      },
      url: EXAMPLE_DOC_URL
    }).then(_ => {
      assert.ok(typeof manifestGather.artifact.value === 'object');
    });
  });
});
