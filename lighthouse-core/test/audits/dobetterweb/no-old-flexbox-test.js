/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NoOldFlexboxAudit = require('../../../audits/dobetterweb/no-old-flexbox.js');
const assert = require('assert');
const stylesData = require('../../fixtures/styles-gatherer.json');

/* eslint-env mocha */

describe('Page does not use old CSS flexbox', () => {
  it('passes when no stylesheets were collected on the page', () => {
    const auditResult = NoOldFlexboxAudit.audit({
      Styles: [],
      URL: {finalUrl: 'https://example.com'},
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.results.length, 0);
  });

  it('fails when display: box is used', () => {
    const auditResult = NoOldFlexboxAudit.audit({
      Styles: stylesData,
      URL: {finalUrl: 'https://example.com'},
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.extendedInfo.value.results.length, 2);
    assert.equal(auditResult.extendedInfo.value.results.length, 2);
    assert.equal(auditResult.extendedInfo.value.results[0].url, '/do_better_web_tests.html');
    assert.ok(auditResult.extendedInfo.value.results[0].pre.match(/display\: box/));

    const headings = auditResult.extendedInfo.value.tableHeadings;
    assert.deepEqual(Object.keys(headings).map(key => headings[key]),
        ['URL', 'Line in the stylesheet / <style>', 'Column start/end', 'Snippet'],
        'table headings are correct and in order');
  });

  it('passes when display: box is not used', () => {
    const auditResult = NoOldFlexboxAudit.audit({
      Styles: stylesData.slice(1),
      URL: {finalUrl: 'https://example.com'},
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.results.length, 0);
  });
});
