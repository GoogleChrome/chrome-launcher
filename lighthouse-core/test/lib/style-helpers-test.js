/**
 * @license
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

const StyleHelpers = require('../../lib/styles-helpers');
const assert = require('assert');

const stylesheets = require('../fixtures/styles-gatherer.json');

/* eslint-env mocha */

describe('style helpers', () => {
  describe('filterStylesheetsByUsage()', function() {
    it('can take optional arguments', () => {
      let results = StyleHelpers.filterStylesheetsByUsage(stylesheets);
      assert.equal(results.length, 0);

      results = StyleHelpers.filterStylesheetsByUsage(
          stylesheets, 'display', 'box');
      assert.equal(results.length, 1, 'accepts CSS property name/value pair');

      results = StyleHelpers.filterStylesheetsByUsage(
          stylesheets, 'color');
      assert.equal(results.length, 2, 'accepts only CSS property name');

      results = StyleHelpers.filterStylesheetsByUsage(
          stylesheets, null, 'box');
      assert.equal(results.length, 1, 'accepts only CSS property value');
    });

    it('returns no results when not found', () => {
      let results = StyleHelpers.filterStylesheetsByUsage(
          stylesheets, 'someunknownprop', 'someunknownval');
      assert.equal(results.length, 0, 'CSS property name/value pair not found');

      results = StyleHelpers.filterStylesheetsByUsage(
          stylesheets, 'someunknownprop');
      assert.equal(results.length, 0, 'CSS property name not found');

      results = StyleHelpers.filterStylesheetsByUsage(
          stylesheets, null, 'someunknownval');
      assert.equal(results.length, 0, 'CSS property value not found');

      results = StyleHelpers.filterStylesheetsByUsage(
          stylesheets, 'someunknownprop', 'box');
      assert.equal(results.length, 0, 'unknown CSS property with known value not found');

      results = StyleHelpers.filterStylesheetsByUsage(
          stylesheets, 'display', 'someunknownval');
      assert.equal(results.length, 0, 'known CSS property with unknown value not found');
    });
  });

  describe('getFormattedStyleRule()', function() {
    it('formats output correctly', () => {
      const results = StyleHelpers.filterStylesheetsByUsage(
          stylesheets, 'display', 'box');

      const actual = StyleHelpers.getFormattedStyleRule(
          results[0].content, results[0].parsedContent[0]);
      const expected = `p,div {
  display: box;
}`;

      assert.equal(actual.location, 'line: 8, row: 4, col: 17');
      assert.equal(actual.styleRule, expected);
    });
  });
});
