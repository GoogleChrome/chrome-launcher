/**
 * Copyright 2017 Google Inc. All rights reserved.
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

const handlebarHelpers = require('../../report/handlebar-helpers.js');
const assert = require('assert');

/* eslint-env mocha */

// Most of the functionality is tested via the Formatter tests, but in this
// particular case, we need to test the functionality that would be branched for
// the extension, which is relatively minor stuff.
describe('Handlebar helpers', () => {
  it('`nameToLink` works properly', () => {
    const text = handlebarHelpers.nameToLink('href="#Progressive-wEb-app"');
    assert.ok(/href="#progressive-web-app"/gm.test(text));
  });

  it('`not` works properly', () => {
    const text = handlebarHelpers.not(false);
    assert.ok(text);
  });

  it('`kebabCase` works properly', () => {
    assert.equal(handlebarHelpers.kebabCase(undefined), '');
    assert.equal(handlebarHelpers.kebabCase('foo'), 'foo');
    assert.equal(handlebarHelpers.kebabCase('fooBarBaz'), 'foo-bar-baz');
    assert.equal(handlebarHelpers.kebabCase('a long Phrase'), 'a-long-phrase');
    assert.equal(handlebarHelpers.kebabCase('myURL$'), 'my-url');
    assert.equal(handlebarHelpers.kebabCase('the401k%_value'), 'the401k-value');
  });

  it('`getAggregationScoreRating` calculates rating', () => {
    assert.equal(handlebarHelpers.getAggregationScoreRating(undefined), 'poor');
    assert.equal(handlebarHelpers.getAggregationScoreRating(1), 'good');
    assert.equal(handlebarHelpers.getAggregationScoreRating(0.95), 'good');
    assert.equal(handlebarHelpers.getAggregationScoreRating(0.50), 'average');
    assert.equal(handlebarHelpers.getAggregationScoreRating(0.10), 'poor');
  });
});
