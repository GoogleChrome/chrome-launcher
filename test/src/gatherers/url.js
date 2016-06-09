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

const URLGather = require('../../../src/gatherers/url');
const assert = require('assert');
let urlGather;

describe('URL gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    urlGather = new URLGather();
  });

  it('returns the correct URL from options', () => {
    const url = 'https://example.com';
    urlGather.beforePass({
      url
    });

    return assert.equal(urlGather.artifact, url);
  });

  it('returns the correct URL from options.driver', () => {
    const url = 'https://example.com';
    urlGather.beforePass({
      driver: {
        url
      }
    });

    return assert.equal(urlGather.artifact, url);
  });

  it('chooses the URL from options over options.driver', () => {
    const url = 'https://example.com';
    const driverUrl = 'https://example2.com';
    urlGather.beforePass({
      url,
      driver: {
        url: driverUrl
      }
    });

    return assert.equal(urlGather.artifact, url);
  });
});
