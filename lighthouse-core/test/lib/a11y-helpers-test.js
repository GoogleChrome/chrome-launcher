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

const A11yHelpers = require('../../lib/a11y-helpers');
const assert = require('assert');

/* eslint-env mocha */

describe('a11y helpers', () => {
  describe('createDebugString()', () => {
    it('handles empty rules', () => {
      const output = A11yHelpers.createDebugString();
      assert.ok(typeof output === 'string');
    });

    it('creates debug strings', () => {
      const emptyDebugString = A11yHelpers.createDebugString({
        nodes: [],
        help: 'http://example.com/'
      });

      assert.equal(emptyDebugString, 'http://example.com/ (Failed on 0 elements)');
    });

    it('refers to a single element if one failure', () => {
      const debugString = A11yHelpers.createDebugString({
        nodes: ['foo'],
        help: 'http://example.com/'
      });

      assert.equal(debugString, 'http://example.com/ (Failed on 1 element)');
    });

    it('refers to multiple elements if multiple failures', () => {
      const debugString = A11yHelpers.createDebugString({
        nodes: ['foo', 'bar'],
        help: 'http://example.com/'
      });

      assert.equal(debugString, 'http://example.com/ (Failed on 2 elements)');
    });
  });
});
