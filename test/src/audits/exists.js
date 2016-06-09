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
const Audit = require('../../../src/audits/manifest-exists.js');
const assert = require('assert');

/* global describe, it*/

describe('Manifest: exists audit', () => {
  it('fails when no manifest present', () => {
    return assert.equal(Audit.audit({Manifest: {
      value: undefined
    }}).value, false);
  });

  it('succeeds when a manifest is present', () => {
    return assert.equal(Audit.audit({Manifest: {
      value: {}
    }}).value, true);
  });

  it('correctly passes through debug strings', () => {
    const debugString = 'No href found on <link rel="manifest">.';

    assert.equal(Audit.audit({
      Manifest: {
        value: {},
        debugString
      }
    }).debugString, debugString);
  });
});
