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

const EventHelpers = require('../../lib/event-helpers');
const assert = require('assert');

const eventListeners = require('../fixtures/page-level-event-listeners.json');

/* eslint-env mocha */

describe('event helpers', () => {
  describe('addFormattedCodeSnippet()', function() {
    it('adds label and code snippet and returns new object', () => {
      eventListeners.forEach(listener => {
        const obj = EventHelpers.addFormattedCodeSnippet(listener);
        assert.ok('label' in obj, 'helper adds a label property');
        assert.ok('code' in obj, 'helper adds a code property');
        assert.ok(obj.label.match(/line: (?:\d+), col: (?:\d+)/),
                  'label is not formatted correctly');
        const regEx = new RegExp(`.addEventListener\\('${listener.type}', `);
        assert.ok(obj.code.match(regEx), 'code snippet is not formatted correctly');
      });
    });

    it('normalizes document and window objects', () => {
      eventListeners.forEach(listener => {
        const obj = EventHelpers.addFormattedCodeSnippet(listener);
        assert.ok(obj.code.indexOf('Window') !== 0, 'Window was not lowercase');
        assert.ok(obj.code.indexOf('#document') !== 0,
                    '#document was not replaced with document');
      });
    });
  });
});
