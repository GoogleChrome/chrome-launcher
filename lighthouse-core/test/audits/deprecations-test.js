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

const DeprecationsAudit = require('../../audits/deprecations.js');
const assert = require('assert');

/* eslint-env mocha */

describe('Console deprecations audit', () => {
  it('passes when no console messages were found', () => {
    const auditResult = DeprecationsAudit.audit({
      ChromeConsoleMessages: []
    });
    assert.equal(auditResult.rawValue, true);
    assert.ok(!auditResult.debugString);
    assert.equal(auditResult.extendedInfo.value.length, 0);
  });

  it('handles deprecations that do not have url or line numbers', () => {
    const auditResult = DeprecationsAudit.audit({
      ChromeConsoleMessages: [
        {
          entry: {
            source: 'deprecation',
            text: 'Deprecation message'
          }
        }
      ]
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.displayValue, '1 warning found');
    assert.equal(auditResult.extendedInfo.value.length, 1);
    assert.equal(auditResult.extendedInfo.value[0].url, 'Unable to determine URL');
    assert.equal(auditResult.extendedInfo.value[0].label, 'line: ???');
  });

  it('fails when deprecation messages are found', () => {
    const URL = 'http://example.com';

    const auditResult = DeprecationsAudit.audit({
      ChromeConsoleMessages: [
        {
          entry: {
            source: 'deprecation',
            lineNumber: 123,
            url: URL,
            text: 'Deprecation message 123'
          }
        }, {
          entry: {
            source: 'deprecation',
            lineNumber: 456,
            url: 'http://example2.com',
            text: 'Deprecation message 456'
          }
        }, {
          entry: {
            source: 'somethingelse',
            lineNumber: 789,
            url: 'http://example3.com',
            text: 'Not a deprecation message 456'
          }
        }
      ]
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.displayValue, '2 warnings found');
    assert.equal(auditResult.extendedInfo.value.length, 2);
    assert.equal(auditResult.extendedInfo.value[0].url, URL);
    assert.equal(auditResult.extendedInfo.value[0].label, 'line: 123');
  });
});
