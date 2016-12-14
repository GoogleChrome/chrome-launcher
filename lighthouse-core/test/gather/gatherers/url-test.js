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

const URLGather = require('../../../gather/gatherers/url');
const assert = require('assert');

describe('URL gatherer', () => {
  it('returns the correct URL from options', () => {
    const urlGather = new URLGather();
    const url = 'https://example.com';
    const artifact = urlGather.afterPass({
      url: url
    });

    return assert.equal(artifact.finalUrl, url);
  });
});
