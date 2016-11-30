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

const AppCacheManifestAttrAudit = require('../../../audits/dobetterweb/appcache-manifest.js');
const assert = require('assert');

/* eslint-env mocha */

describe('Appcache manifest audit', () => {
  it('fails when gatherer failed', () => {
    const auditResult = AppCacheManifestAttrAudit.audit({
      AppCacheManifest: -1
    });
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.debugString);
  });

  it('fails when <html> contains a manifest attribute', () => {
    const auditResult = AppCacheManifestAttrAudit.audit({
      AppCacheManifest: 'manifest-name'
    });
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.displayValue);
  });

  it('passes when <html> does not contain a manifest attribute', () => {
    assert.equal(AppCacheManifestAttrAudit.audit({
      AppCacheManifest: null
    }).rawValue, true);
  });
});
