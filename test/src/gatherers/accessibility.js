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

const AccessibilityGather = require('../../../src/gatherers/accessibility');
const assert = require('assert');
let accessibilityGather;

const isExpectedOutput = artifact => {
  return 'raw' in artifact && 'value' in artifact;
};

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
    }).then(_ => {
      assert.ok(typeof accessibilityGather.artifact === 'object');
    });
  });

  it('handles driver failure', () => {
    return accessibilityGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.reject('such a fail');
        }
      }
    }).then(_ => {
      assert(false);
    }).catch(_ => {
      assert.ok(isExpectedOutput(accessibilityGather.artifact));
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
    }).then(_ => {
      assert.ok(accessibilityGather.artifact.debugString === error);
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
    }).then(_ => {
      assert.ok(typeof accessibilityGather.artifact === 'object');
      assert.equal(accessibilityGather.artifact.name, 'a11y');
    });
  });
});
