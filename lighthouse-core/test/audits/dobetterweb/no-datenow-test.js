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

const DateNowUseAudit = require('../../../audits/dobetterweb/no-datenow.js');
const assert = require('assert');

const URL = 'https://example.com';

/* eslint-env mocha */

describe('Page does not use Date.now()', () => {
  it('fails when no input present', () => {
    const auditResult = DateNowUseAudit.audit({});
    assert.equal(auditResult.rawValue, -1);
    assert.ok(auditResult.debugString);
  });

  it('passes when Date.now() is not used', () => {
    const auditResult = DateNowUseAudit.audit({
      DateNowUse: {usage: []},
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.length, 0);
  });

  it('passes when Date.now() is used on a different origin', () => {
    const auditResult = DateNowUseAudit.audit({
      DateNowUse: {
        usage: [
          {url: 'http://different.com/two', line: 2, col: 2},
          {url: 'http://example2.com/two', line: 2, col: 22}
        ]
      },
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.length, 0);
  });

  it('fails when Date.now() is used on the origin', () => {
    const auditResult = DateNowUseAudit.audit({
      DateNowUse: {
        usage: [
          {url: 'http://example.com/one', line: 1, col: 1},
          {url: 'http://example.com/two', line: 10, col: 1},
          {url: 'http://example2.com/two', line: 2, col: 22}
        ]
      },
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.extendedInfo.value.length, 2);
  });

  it('only passes when has url property', () => {
    const auditResult = DateNowUseAudit.audit({
      DateNowUse: {
        usage: [
          {line: 1, col: 1},
          {url: 'http://example.com/two', line: 10, col: 1},
          {url: 'http://example2.com/two', line: 2, col: 22}
        ]
      },
      URL: {finalUrl: URL},
    });

    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.extendedInfo.value.length, 1);
  });
});
