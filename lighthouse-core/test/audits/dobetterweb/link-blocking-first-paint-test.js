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

describe('Block First Paint audit', () => {
  it('fails when no input present', () => {
    const auditResult = LinkBlockingFirstPaintAudit.audit({});
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.debugString);
  });

  it('fails when error input present', () => {
    const auditResult = LinkBlockingFirstPaintAudit.audit({
      LinksBlockingFirstPaint: {
        value: -1
      }
    });
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.debugString);
  });

  it('fails when there are links found which block first paint', () => {
    const linkDetails = {
      href: 'http://google.com/css/style.css',
      disabled: false,
      media: '',
      rel: 'stylesheet'
    };
    const auditResult = LinkBlockingFirstPaintAudit.audit({
      LinksBlockingFirstPaint: {
        items: [{
          link: linkDetails,
          transferSize: 100,
          spendTime: 100
        }],
        total: {
          transferSize: 100,
          spendTime: 100
        }
      }
    });
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.extendedInfo.value.length, 1);
    assert.ok(auditResult.extendedInfo.value[0].url.match(linkDetails.href));
    assert.ok(auditResult.extendedInfo.value[0].label.match('delayed first paint'));
  });

  it('passes when there are no links found which block first paint', () => {
    const auditResult = LinkBlockingFirstPaintAudit.audit({
      LinksBlockingFirstPaint: {
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
