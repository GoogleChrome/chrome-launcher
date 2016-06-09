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

const ManifestGather = require('../../../src/gatherers/manifest');
const assert = require('assert');
let manifestGather;

const isExpectedOutput = artifact => {
  return 'raw' in artifact && 'value' in artifact;
};

describe('Manifest gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    manifestGather = new ManifestGather();
  });

  it('returns an artifact', () => {
    return manifestGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve('');
        }
      }
    }).then(_ => {
      assert.ok(typeof manifestGather.artifact === 'object');
    });
  });

  it('handles driver failure', () => {
    return manifestGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.reject('such a fail');
        }
      }
    }).then(_ => {
      assert(false);
    }).catch(_ => {
      assert.ok(isExpectedOutput(manifestGather.artifact));
    });
  });

  it('propagates error retrieving the manifest', () => {
    const error = 'There was an error.';
    return manifestGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve({
            error
          });
        }
      }
    }).then(_ => {
      assert.ok(manifestGather.artifact.debugString === error);
    });
  });

  it('creates a manifest object for valid manifest content', () => {
    const manifestContent = JSON.stringify({
      name: 'App'
    });
    return manifestGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve({
            manifestContent
          });
        }
      }
    }).then(_ => {
      assert.ok(typeof manifestGather.artifact.value === 'object');
    });
  });
});
