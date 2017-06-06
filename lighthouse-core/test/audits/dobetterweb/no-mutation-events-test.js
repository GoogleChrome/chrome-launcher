/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NoMutationEventsAudit = require('../../../audits/dobetterweb/no-mutation-events.js');
const assert = require('assert');

const fixtureData = require('../../fixtures/page-level-event-listeners.json');

const URL = 'https://example.com';

/* eslint-env mocha */

describe('Page does not use mutation events', () => {
  it('passes when mutation events are not used', () => {
    const auditResult = NoMutationEventsAudit.audit({
      EventListeners: [],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.results.length, 0);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('fails when mutation events are used on the origin', () => {
    const auditResult = NoMutationEventsAudit.audit({
      EventListeners: fixtureData,
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.extendedInfo.value.results.length, 4);
    assert.equal(auditResult.details.items.length, 4);

    const headings = auditResult.extendedInfo.value.tableHeadings;
    assert.deepEqual(Object.keys(headings).map(key => headings[key]),
                     ['URL', 'Line/Col', 'Event', 'Snippet'],
                     'table headings are correct and in order');
    const itemHeaders = auditResult.details.itemHeaders;
    assert.deepEqual(Object.keys(itemHeaders).map(key => itemHeaders[key].text),
                     ['URL', 'Event', 'Line', 'Col', 'Snippet'],
                     'table headings are correct and in order');
  });

  it('fails when listener is missing a url property', () => {
    const auditResult = NoMutationEventsAudit.audit({
      EventListeners: fixtureData,
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.extendedInfo.value.results[1].url === undefined);
    assert.equal(auditResult.extendedInfo.value.results.length, 4);
    assert.ok(auditResult.details.items[1].url === undefined);
    assert.equal(auditResult.details.items.length, 4);
  });

  it('fails when listener has a bad url property', () => {
    const auditResult = NoMutationEventsAudit.audit({
      EventListeners: [
        {
          objectName: 'Window',
          type: 'DOMNodeInserted',
          useCapture: false,
          passive: false,
          url: 'eval(<context>):54:21',
          line: 54,
          col: 21,
        },
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.extendedInfo.value.results[0].url === 'eval(<context>):54:21');
    assert.equal(auditResult.extendedInfo.value.results.length, 1);
    assert.equal(auditResult.details.items[0][0].text, 'eval(<context>):54:21');
    assert.equal(auditResult.details.items.length, 1);
  });
});
