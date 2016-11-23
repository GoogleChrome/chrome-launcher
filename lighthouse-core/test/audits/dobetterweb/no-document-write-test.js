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

const DocWriteUseAudit = require('../../../audits/dobetterweb/no-document-write.js');
const assert = require('assert');

const URL = 'https://example.com';

/* eslint-env mocha */

describe('Page does not use document.write()', () => {
  it('fails when gatherer returns error', () => {
    const debugString = 'interesting debug string';
    const auditResult = DocWriteUseAudit.audit({
      DocWriteUse: {value: -1, debugString}
    });
    assert.equal(auditResult.rawValue, -1);
    assert.equal(auditResult.debugString, debugString);
  });

  it('fails when no input present', () => {
    const auditResult = DocWriteUseAudit.audit({});
    assert.equal(auditResult.rawValue, -1);
    assert.ok(auditResult.debugString);
  });

  it('passes when document.write() is not used', () => {
    const auditResult = DocWriteUseAudit.audit({
      DocWriteUse: {usage: []},
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.length, 0);
  });

  it('fails when document.write() is used', () => {
    const auditResult = DocWriteUseAudit.audit({
      DocWriteUse: {
        usage: [
          {url: 'http://example.com/one', line: 1, col: 1},
          {url: 'http://example.com/two', line: 10, col: 1},
          {url: 'http://example2.com/two', line: 2, col: 22}
        ]
      },
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.extendedInfo.value.length, 3);
  });
});
