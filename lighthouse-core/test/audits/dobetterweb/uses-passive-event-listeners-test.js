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
  it('fails when gatherer returns error', () => {
    const debugString = 'Unable to gather passive event listeners usage.';
    const auditResult = PassiveEventsAudit.audit({
      EventListeners: {
        rawValue: -1,
        debugString: debugString
      },
      URL: {finalUrl: URL}
    });
    assert.equal(auditResult.rawValue, -1);
    assert.equal(auditResult.debugString, debugString);
  });

  it('fails when scroll blocking listeners should be passive', () => {
    const auditResult = PassiveEventsAudit.audit({
      EventListeners: fixtureData,
      URL: {finalUrl: URL}
    });
    assert.equal(auditResult.rawValue, false);

    for (let i = 0; i < auditResult.extendedInfo.value.length; ++i) {
      const val = auditResult.extendedInfo.value[i];
      assert.ok(!val.passive, 'results should all be non-passive listeners');
      assert.notEqual(PassiveEventsAudit.SCROLL_BLOCKING_EVENTS.indexOf(val.type), -1,
          'results should not contain other types of events');
    }
    assert.equal(auditResult.extendedInfo.value.length, 6);
    assert.equal(auditResult.extendedInfo.value[0].url, fixtureData[0].url);
    assert.ok(auditResult.extendedInfo.value[0].code.match(/addEventListener/));
  });

  it('passes scroll blocking listeners should be passive', () => {
    const auditResult = PassiveEventsAudit.audit({
      EventListeners: [],
      URL: {finalUrl: URL}
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.length, 0);
  });

  it('fails when listener is missing a url property', () => {
    const auditResult = PassiveEventsAudit.audit({
      EventListeners: fixtureData,
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.extendedInfo.value[1].url === undefined);
    assert.equal(auditResult.extendedInfo.value.length, 6);
  });
});
