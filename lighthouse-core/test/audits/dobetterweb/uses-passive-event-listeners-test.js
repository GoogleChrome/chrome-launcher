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

const PassiveEventsAudit = require('../../../audits/dobetterweb/uses-passive-event-listeners.js');
const assert = require('assert');
const fixtureData = require('../../fixtures/page-level-event-listeners.json');

const URL = 'https://example.com';

/* eslint-env mocha */

describe('Page uses passive events listeners where applicable', () => {
  it('it returns error value when no input present', () => {
    const auditResult = PassiveEventsAudit.audit({});
    assert.equal(auditResult.rawValue, -1);
    assert.ok(auditResult.debugString);
  });

  it('debugString is present if gatherer fails', () => {
    const debugString = 'Unable to gather passive events listeners usage.';
    const auditResult = PassiveEventsAudit.audit({
      PageLevelEventListeners: {
        rawValue: -1,
        debugString: debugString
      },
      URL: {finalUrl: URL}
    });
    assert.equal(auditResult.rawValue, -1);
    assert.equal(auditResult.debugString, debugString);
  });

  it('fails when page-level scroll blocking listeners should be passive', () => {
    const auditResult = PassiveEventsAudit.audit({
      PageLevelEventListeners: fixtureData,
      URL: {finalUrl: URL}
    });
    assert.equal(auditResult.rawValue, false);

    for (let i = 0; i < auditResult.extendedInfo.value.length; ++i) {
      const val = auditResult.extendedInfo.value[i];
      assert.ok(!val.passive, 'results should all be non-passive listeners');
      assert.notEqual(PassiveEventsAudit.SCROLL_BLOCKING_EVENTS.indexOf(val.type), -1,
          'results should not contain other types of events');
    }
    assert.equal(auditResult.extendedInfo.value.length, 5);
    assert.equal(auditResult.extendedInfo.value[0].url, fixtureData[0].url);
    assert.ok(auditResult.extendedInfo.value[0].code.match(/addEventListener/));
  });

  it('passes page-level scroll blocking listeners should be passive', () => {
    const auditResult = PassiveEventsAudit.audit({
      PageLevelEventListeners: [],
      URL: {finalUrl: URL}
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.length, 0);
  });
});
