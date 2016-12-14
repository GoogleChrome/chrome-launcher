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

const NoConsoleTimeAudit = require('../../../audits/dobetterweb/no-console-time.js');
const assert = require('assert');

const URL = 'https://example.com';

/* eslint-env mocha */

describe('Page does not use console.time()', () => {
  it('fails when gatherer returns error', () => {
    const debugString = 'interesting debug string';
    const auditResult = NoConsoleTimeAudit.audit({
      ConsoleTimeUsage: {value: -1, debugString}
    });
    assert.equal(auditResult.rawValue, -1);
    assert.equal(auditResult.debugString, debugString);
  });

  it('passes when console.time() is not used', () => {
    const auditResult = NoConsoleTimeAudit.audit({
      ConsoleTimeUsage: {usage: []},
      URL: {finalUrl: URL}
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.length, 0);
  });

  it('passes when console.time() is used on a different origin', () => {
    const auditResult = NoConsoleTimeAudit.audit({
      ConsoleTimeUsage: {
        usage: [
          {url: 'http://different.com/two', line: 2, col: 2},
          {url: 'http://example2.com/two', line: 2, col: 22}
        ]
      },
      URL: {finalUrl: URL}
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.length, 0);
  });

  it('fails when console.time() is used on the origin', () => {
    const auditResult = NoConsoleTimeAudit.audit({
      ConsoleTimeUsage: {
        usage: [
          {url: 'http://example.com/one', line: 1, col: 1},
          {url: 'http://example.com/two', line: 10, col: 1},
          {url: 'http://example2.com/two', line: 2, col: 22}
        ]
      },
      URL: {finalUrl: URL}
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.extendedInfo.value.length, 2);
  });

  it('fails when console.time() is used in eval()', () => {
    const auditResult = NoConsoleTimeAudit.audit({
      ConsoleTimeUsage: {
        usage: [
          {url: 'http://example.com/one', line: 1, col: 1, isEval: false},
          {url: 'module.exports (blah/handler.js:5:18)', line: 5, col: 18, isEval: true},
          {url: 'module.exports (blah/handler.js:3:18)', line: 3, col: 18, isEval: true}
        ]
      },
      URL: {finalUrl: URL}
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.extendedInfo.value.length, 3);
  });
});
