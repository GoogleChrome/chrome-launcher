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

const NoOldFlexboxAudit = require('../../../audits/dobetterweb/no-old-flexbox.js');
const assert = require('assert');
const stylesData = require('../../fixtures/styles-gatherer.json');

/* eslint-env mocha */

describe('Page does not use old CSS flexbox', () => {
  it('debugString is present if gatherer fails', () => {
    const debugString = 'No active stylesheets were collected.';
    const auditResult = NoOldFlexboxAudit.audit({
      Styles: {
        rawValue: -1,
        debugString: debugString
      }
    });
    assert.equal(auditResult.rawValue, -1);
    assert.equal(auditResult.debugString, debugString);
  });

  it('passes when no stylesheets were collected on the page', () => {
    const auditResult = NoOldFlexboxAudit.audit({
      Styles: []
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.length, 0);
  });

  it('fails when display: box is used', () => {
    const auditResult = NoOldFlexboxAudit.audit({
      Styles: stylesData
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.extendedInfo.value.length, 2);
    assert.equal(auditResult.extendedInfo.value.length, 2);
    assert.equal(auditResult.extendedInfo.value[0].url, stylesData[0].header.sourceURL);
    assert.ok(auditResult.extendedInfo.value[0].code.match(/display\: box/));
  });

  it('passes when display: box is not used', () => {
    const auditResult = NoOldFlexboxAudit.audit({
      Styles: stylesData.slice(1)
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.length, 0);
  });
});
