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

const LinkBlockingFirstPaintAudit =
    require('../../../audits/dobetterweb/link-blocking-first-paint.js');
const assert = require('assert');

/* eslint-env mocha */

describe('Link Block First Paint audit', () => {
  it('fails when there are links found which block first paint', () => {
    const linkDetails = {
      tagName: 'LINK',
      href: 'http://google.com/css/style.css',
      url: 'http://google.com/css/style.css',
      disabled: false,
      media: '',
      rel: 'stylesheet'
    };
    const auditResult = LinkBlockingFirstPaintAudit.audit({
      TagsBlockingFirstPaint: [
        {
          tag: linkDetails,
          transferSize: 100,
          startTime: 5,
          endTime: 5.4,
        },
        {
          tag: linkDetails,
          transferSize: 100,
          startTime: 4.9,
          endTime: 5.1,
        },
        {
          tag: linkDetails,
          transferSize: 100,
          startTime: 4.7,
          endTime: 4.73, // should be ignored for being <50ms
        },
        {
          tag: {tagName: 'SCRIPT'},
          transferSize: 20,
          spendTime: 20,
        }
      ]
    });
    assert.equal(auditResult.rawValue, 500);
    assert.ok(auditResult.displayValue.match('2 resources delayed first paint by 500ms'));
    assert.equal(auditResult.extendedInfo.value.results.length, 2);
    assert.ok(auditResult.extendedInfo.value.results[0].url.includes('css/style.css'), 'has a url');
    assert.equal(auditResult.extendedInfo.value.results[0].totalMs, '500ms');
    assert.equal(auditResult.extendedInfo.value.results[1].totalMs, '200ms');
  });

  it('passes when there are no links found which block first paint', () => {
    const auditResult = LinkBlockingFirstPaintAudit.audit({
      TagsBlockingFirstPaint: []
    });
    assert.equal(auditResult.rawValue, 0);
    assert.equal(auditResult.extendedInfo.value.results.length, 0);
  });
});
