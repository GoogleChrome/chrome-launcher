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
const Audit = require('../../../src/audits/meta-theme-color.js');
const assert = require('assert');

/* global describe, it*/

describe('HTML: theme-color audit', () => {
  it('fails and warns when no window or html present', () => {
    const emptyAudit = Audit.audit({});

    assert.equal(emptyAudit.value, false);
    assert(emptyAudit.debugString);
  });

  it('fails and warns when no value given', () => {
    const nullColorAudit = Audit.audit({
      ThemeColor: null
    });

    assert.equal(nullColorAudit.value, false);
    assert(nullColorAudit.debugString);
  });

  it('fails and warns when theme-color has an invalid CSS color', () => {
    const invalidColorAudit = Audit.audit({
      ThemeColor: '#1234567'
    });

    assert.equal(invalidColorAudit.value, false);
    assert(invalidColorAudit.debugString);
  });

  it('succeeds when theme-color present in the html', () => {
    assert.equal(Audit.audit({
      ThemeColor: '#fafa33'
    }).value, true);
  });

  it('succeeds when theme-color has a CSS nickname content value', () => {
    assert.equal(Audit.audit({
      ThemeColor: 'red'
    }).value, true);
  });
});
