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

const NoMutationEventsAudit = require('../../../audits/dobetterweb/no-mutation-events.js');
const assert = require('assert');

const fixtureData = require('../../fixtures/page-level-event-listeners.json');

const URL = 'https://example.com';

/* eslint-env mocha */

describe('Page does not use mutation events', () => {
  it('it returns error value when no input present', () => {
    const auditResult = NoMutationEventsAudit.audit({});
    assert.equal(auditResult.rawValue, -1);
    assert.ok(auditResult.debugString);
  });

  it('passes when mutation events are not used', () => {
    const auditResult = NoMutationEventsAudit.audit({
      PageLevelEventListeners: [],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.length, 0);
  });

  it('fails when mutation events are used on the origin', () => {
    const auditResult = NoMutationEventsAudit.audit({
      PageLevelEventListeners: fixtureData,
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.extendedInfo.value.length, 3);
  });

  it('fails when listener is missing a url property', () => {
    const auditResult = NoMutationEventsAudit.audit({
      PageLevelEventListeners: fixtureData,
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.extendedInfo.value[1].url === undefined);
    assert.equal(auditResult.extendedInfo.value.length, 3);
  });
});
