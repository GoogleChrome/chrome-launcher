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

const ExternalAnchorsAudit =
  require('../../../audits/dobetterweb/external-anchors-use-rel-noopener.js');
const assert = require('assert');

const URL = 'https://google.com/test';

/* eslint-env mocha */

describe('External anchors use rel="noopener"', () => {
  it('fails when gatherer failed', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorsWithNoRelNoopener: -1
    });
    assert.equal(auditResult.rawValue, -1);
    assert.ok(auditResult.debugString);
  });

  it('passes when links are from same hosts as the page host', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorsWithNoRelNoopener: {
        usages: [
          {href: 'https://google.com/test'},
          {href: 'https://google.com/test1'}
        ]
      },
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.length, 0);
  });

  it('fails when links are from different hosts than the page host', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorsWithNoRelNoopener: {
        usages: [
          {href: 'https://example.com/test'},
          {href: 'https://example.com/test1'}
        ]
      },
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.extendedInfo.value.length, 2);
  });

  it('handles links with no href attribute', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorsWithNoRelNoopener: {
        usages: [
          {href: ''},
          {href: 'http://'},
          {href: 'http:'}
        ]
      },
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.extendedInfo.value.length, 3);
    assert.ok(auditResult.debugString, 'includes debugString');
  });
});
