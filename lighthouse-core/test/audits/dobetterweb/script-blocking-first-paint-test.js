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

const ScriptBlockingFirstPaintAudit =
    require('../../../audits/dobetterweb/script-blocking-first-paint.js');
const assert = require('assert');

/* eslint-env mocha */

describe('Script Block First Paint audit', () => {
  it('fails when there are scripts found which block first paint', () => {
    const scriptDetails = {
      tagName: 'SCRIPT',
      src: 'http://google.com/js/app.js',
      url: 'http://google.com/js/app.js',
    };
    const auditResult = ScriptBlockingFirstPaintAudit.audit({
      TagsBlockingFirstPaint: [
        {
          tag: scriptDetails,
          transferSize: 100,
          startTime: 1,
          endTime: 1.1
        },
        {
          tag: scriptDetails,
          transferSize: 50,
          startTime: .95,
          endTime: 1
        },
        {
          tag: {tagName: 'LINK'},
          transferSize: 110,
          spendTime: 110
        }
      ]
    });
    assert.equal(auditResult.rawValue, 150);
    assert.ok(auditResult.displayValue.match('2 resources delayed first paint by 150ms'));
    assert.equal(auditResult.extendedInfo.value.results.length, 2);
    assert.ok(auditResult.extendedInfo.value.results[0].url.includes('js/app.js'), 'has a url');
    assert.equal(auditResult.extendedInfo.value.results[0].totalMs, '150ms');
    assert.equal(auditResult.extendedInfo.value.results[1].totalMs, '50ms');
  });

  it('passes when there are no scripts found which block first paint', () => {
    const auditResult = ScriptBlockingFirstPaintAudit.audit({
      TagsBlockingFirstPaint: []
    });
    assert.equal(auditResult.rawValue, 0);
    assert.equal(auditResult.extendedInfo.value.results.length, 0);
  });
});
