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

const Formatter = require('../../formatters/formatter.js');
const assert = require('assert');

/* global describe, it */

describe('Formatter', () => {
  it('returns supported formats', () => {
    // Force the internal _formatters to not exist
    Formatter._formatters = null;
    assert.notEqual(Formatter.SUPPORTED_FORMATS, undefined);
  });

  it('returns supported formats when called by name', () => {
    // Force the internal _formatters to not exist
    Formatter._formatters = null;
    assert.notEqual(Formatter.getByName('accessibility'), undefined);
  });

  it('throws when invalid format is provided', () => {
    assert.throws(_ => Formatter.getByName('invalid-format'), Error);
  });

  it('throws when getFormatter is called directly', () => {
    assert.throws(_ => Formatter.getFormatter(), Error);
  });
});
