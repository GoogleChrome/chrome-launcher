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

const AccessibilityGather = require('../../../gather/gatherers/accessibility');
const assert = require('assert');
let accessibilityGather;

describe('Accessibility gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    accessibilityGather = new AccessibilityGather();
  });

  it('fails gracefully', () => {
    return accessibilityGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve();
        }
      }
    }).then(artifact => {
      assert.ok(typeof artifact === 'object');
    });
  });

  it('handles driver failure', () => {
    return accessibilityGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.reject('such a fail');
        }
      }
    }).then(artifact => {
      assert.ok(artifact.debugString);
    });
  });

  it('propagates error retrieving the results', () => {
    const error = 'There was an error.';
    return accessibilityGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve({
            error
          });
        }
      }
    }).then(artifact => {
      assert.ok(artifact.debugString === error);
    });
  });

  it('creates an object for valid results', () => {
    return accessibilityGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve({
            name: 'a11y'
          });
        }
      }
    }).then(artifact => {
      assert.ok(typeof artifact === 'object');
      assert.equal(artifact.name, 'a11y');
    });
  });
});
