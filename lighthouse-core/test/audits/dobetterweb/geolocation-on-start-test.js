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

const GeolocationOnStartAudit = require('../../../audits/dobetterweb/geolocation-on-start.js');
const assert = require('assert');

/* eslint-env mocha */

describe('UX: geolocation audit', () => {
  it('fails when gatherer returns -1', () => {
    const auditResult = GeolocationOnStartAudit.audit(-1);
    assert.equal(auditResult.rawValue, -1);
    assert.ok(auditResult.debugString.match('did not run'));
  });

  it('fails when no input present', () => {
    const auditResult = GeolocationOnStartAudit.audit({});
    assert.equal(auditResult.rawValue, -1);
    assert.ok(auditResult.debugString);
  });

  it('prints debugString info if present in artifact', () => {
    const auditResult = GeolocationOnStartAudit.audit({
      GeolocationOnStart: {
        value: -1,
        debugString: 'Unable to determine'
      }
    });
    assert.equal(auditResult.rawValue, -1);
    assert.ok(auditResult.debugString.match('Unable to determine'));
  });

  it('fails when geolocation has been automatically requested', () => {
    const auditResult = GeolocationOnStartAudit.audit({
      GeolocationOnStart: {
        usage: [
          {url: 'http://different.com/two', line: 2, col: 2},
          {url: 'http://example2.com/two', line: 2, col: 22}
        ]
      },
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.extendedInfo.value.length, 2);
  });

  it('passes when geolocation has not been automatically requested', () => {
    const auditResult = GeolocationOnStartAudit.audit({
      GeolocationOnStart: {usage: []}
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.length, 0);
  });
});
