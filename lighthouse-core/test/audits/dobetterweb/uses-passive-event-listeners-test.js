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
  it('fails when scroll blocking listeners should be passive', () => {
    const auditResult = PassiveEventsAudit.audit({
      EventListeners: fixtureData,
      URL: {finalUrl: URL}
    });
    assert.equal(auditResult.rawValue, false);

    for (let i = 0; i < auditResult.extendedInfo.value.results.length; ++i) {
      const val = auditResult.extendedInfo.value.results[i];
      assert.ok(!val.passive, 'results should all be non-passive listeners');
      assert.ok(PassiveEventsAudit.SCROLL_BLOCKING_EVENTS.includes(val.type),
          'results should not contain other types of events');
    }
    assert.equal(auditResult.extendedInfo.value.results.length, 6);
    assert.equal(auditResult.extendedInfo.value.results[0].url, fixtureData[0].url);
    assert.ok(auditResult.extendedInfo.value.results[0].pre.match(/addEventListener/));

    const headings = auditResult.extendedInfo.value.tableHeadings;
    assert.deepEqual(Object.keys(headings).map(key => headings[key]),
                     ['URL', 'Line/Col', 'Type', 'Snippet'],
                     'table headings are correct and in order');
  });

  it('passes scroll blocking listeners should be passive', () => {
    const auditResult = PassiveEventsAudit.audit({
      EventListeners: [],
      URL: {finalUrl: URL}
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.results.length, 0);
  });

  it('fails when listener is missing a url property', () => {
    const auditResult = PassiveEventsAudit.audit({
      EventListeners: fixtureData,
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.extendedInfo.value.results[1].url === undefined);
    assert.equal(auditResult.extendedInfo.value.results.length, 6);
  });

  it('fails when listener has a bad url property', () => {
    const auditResult = PassiveEventsAudit.audit({
      EventListeners: [
        {
          objectName: 'Window',
          type: 'wheel',
          useCapture: false,
          passive: false,
          url: 'eval(<context>):54:21',
          handler: {description: 'x = 1;'},
          line: 54,
          col: 21,
        },
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.extendedInfo.value.results[0].url === 'eval(<context>):54:21');
    assert.equal(auditResult.extendedInfo.value.results.length, 1);
  });
});
