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
const Audit = require('../../../src/audits/manifest-short-name-length.js');
const assert = require('assert');
const manifestParser = require('../../../src/lib/manifest-parser');

/* global describe, it*/

describe('Manifest: short_name_length audit', () => {
  it('fails when an empty manifest is present', () => {
    const Manifest = manifestParser('{}');
    return assert.equal(Audit.audit({Manifest}).value, false);
  });

  it('fails when a manifest contains no short_name and too long name', () => {
    const manifestSrc = JSON.stringify({
      name: 'i\'m much longer than the recommended size'
    });
    const Manifest = manifestParser(manifestSrc);
    const out = Audit.audit({Manifest});
    assert.equal(out.value, false);
    assert.notEqual(out.debugString, undefined);
  });

  // Need to disable camelcase check for dealing with short_name.
  /* eslint-disable camelcase */
  it('fails when a manifest contains a too long short_name', () => {
    const manifestSrc = JSON.stringify({
      short_name: 'i\'m much longer than the recommended size'
    });
    const Manifest = manifestParser(manifestSrc);
    const out = Audit.audit({Manifest});
    assert.equal(out.value, false);
    assert.notEqual(out.debugString, undefined);
  });

  it('succeeds when a manifest contains a short_name', () => {
    const manifestSrc = JSON.stringify({
      short_name: 'Lighthouse'
    });
    const Manifest = manifestParser(manifestSrc);
    return assert.equal(Audit.audit({Manifest}).value, true);
  });
  /* eslint-enable camelcase */
});
