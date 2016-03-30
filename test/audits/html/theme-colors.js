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
const Audit = require('../../../audits/html/meta-theme-color.js');
const assert = require('assert');

/* global describe, it*/

describe('HTML: theme-color audit', () => {
  it('fails when no window or html present', () => {
    assert.equal(Audit.audit({}).value, false);
  });

  it('fails when no value given', () => {
    assert.equal(Audit.audit({
      themeColorMeta: null
    }).value, false);
  });

  it('succeeds when theme-color present in the html', () => {
    assert.equal(Audit.audit({
      themeColorMeta: '#fafa33'
    }).value, true);
  });

  it('succeeds when theme-color has a CSS name content value', () => {
    assert.equal(Audit.audit({
      themeColorMeta: 'red'
    }).value, true);
  });
});
