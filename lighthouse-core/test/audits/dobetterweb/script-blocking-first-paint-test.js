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
  it('fails when error input present', () => {
    const debugString = 'first paint debug string';
    const auditResult = ScriptBlockingFirstPaintAudit.audit({
      TagsBlockingFirstPaint: {
        value: -1,
        debugString
      }
    });
    assert.equal(auditResult.rawValue, -1);
    assert.strictEqual(auditResult.debugString, debugString);
  });

  it('fails when there are scripts found which block first paint', () => {
    const scriptDetails = {
      tagName: 'SCRIPT',
      src: 'http://google.com/js/app.js',
      url: 'http://google.com/js/app.js',
    };
    const auditResult = ScriptBlockingFirstPaintAudit.audit({
      TagsBlockingFirstPaint: {
        items: [
          {
            tag: scriptDetails,
            transferSize: 100,
            spendTime: 100
          },
          {
            tag: scriptDetails,
            transferSize: 50,
            spendTime: 50
          },
          {
            tag: {tagName: 'LINK'},
            transferSize: 110,
            spendTime: 110
          }
        ],
        total: {
          transferSize: 260,
          spendTime: 260
        }
      }
    });
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.displayValue.match('2 resources delayed first paint by 150ms'));
    assert.ok(auditResult.extendedInfo.value.length, 2);
    assert.ok(auditResult.extendedInfo.value[0].url.match(scriptDetails.src));
    assert.ok(auditResult.extendedInfo.value[0].label.match('delayed first paint'));
  });

  it('passes when there are no scripts found which block first paint', () => {
    const auditResult = ScriptBlockingFirstPaintAudit.audit({
      TagsBlockingFirstPaint: {
        items: [],
        total: {
          transferSize: 0,
          spendTime: 0
        }
      }
    });
    assert.equal(auditResult.rawValue, true);
    assert.ok(auditResult.extendedInfo.value.length === 0);
  });
});
