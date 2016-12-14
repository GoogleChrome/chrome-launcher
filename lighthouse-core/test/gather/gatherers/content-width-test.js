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

const ContentWidthGatherer = require('../../../gather/gatherers/content-width');
const assert = require('assert');
let contentWidthGatherer;

describe('Content Width gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    contentWidthGatherer = new ContentWidthGatherer();
  });

  it('returns an artifact', () => {
    return contentWidthGatherer.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve({
            scrollWidth: 400,
            viewportWidth: 400
          });
        }
      }
    }).then(artifact => {
      assert.ok(typeof artifact === 'object');
      assert.ok(artifact.viewportWidth === 400);
    });
  });

  it('handles driver failure', () => {
    return contentWidthGatherer.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.reject('such a fail');
        }
      }
    }).then(artifact => {
      assert.equal(artifact.scrollWidth, -1);
    });
  });
});
