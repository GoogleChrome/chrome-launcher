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
const Audit = require('../../../audits/manifest/short-name.js');
const assert = require('assert');
const manifestSrc = JSON.stringify(require('./manifest.json'));
const manifestParser = require('../../../helpers/manifest-parser');
const manifest = manifestParser(manifestSrc).value;

/* global describe, it*/

describe('Manifest: short_name audit', () => {
  it('fails when no manifest present', () => {
    return assert.equal(Audit.audit({}).value, false);
  });

  it('fails when an empty manifest is present', () => {
    return assert.equal(Audit.audit({manifest: {}}).value, false);
  });

  // Need to disable camelcase check for dealing with short_name.
  /* eslint-disable camelcase */
  it('fails when a manifest contains no short_name', () => {
    const inputs = {
      manifest: {
        short_name: null
      }
    };

    return assert.equal(Audit.audit(inputs).value, false);
  });
  /* eslint-enable camelcase */

  it('succeeds when a manifest contains a short_name', () => {
    return assert.equal(Audit.audit({manifest: manifest}).value, true);
  });
});
