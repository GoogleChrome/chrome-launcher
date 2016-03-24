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
const Audit = require('../../../audits/manifest/icons-192.js');
const assert = require('assert');
const manifestParser = require('../../../helpers/manifest-parser');

/* global describe, it*/

describe('Manifest: icons-192 audit', () => {
  it('fails when no manifest present', () => {
    return assert.equal(Audit.audit({}).value, false);
  });

  it('fails when an empty manifest is present', () => {
    return assert.equal(Audit.audit({manifest: {}}).value, false);
  });

  it('fails when a manifest contains no icons', () => {
    const inputs = {
      manifest: {
        icons: null
      }
    };

    return assert.equal(Audit.audit(inputs).value, false);
  });

  it('fails when a manifest contains an icon with no size', () => {
    const manifestSrc = JSON.stringify({
      icons: [{
        src: 'icon.png'
      }]
    });
    const manifest = manifestParser(manifestSrc).value;

    return assert.equal(Audit.audit({manifest}).value, false);
  });

  it('fails when a manifest contains an icon with no 192x192 within its sizes', () => {
    const manifestSrc = JSON.stringify({
      icons: [{
        src: 'icon.png',
        sizes: '72x72 96x96 128x128 256x256'
      }]
    });
    const manifest = manifestParser(manifestSrc).value;

    return assert.equal(Audit.audit({manifest}).value, false);
  });

  it('succeeds when a manifest contains a 192x192 icon', () => {
    const manifestSrc = JSON.stringify(require('./manifest.json'));
    const manifest = manifestParser(manifestSrc).value;

    return assert.equal(Audit.audit({manifest}).value, true);
  });

  it('succeeds when a manifest contains an icon with 192x192 within its sizes', () => {
    const manifestSrc = JSON.stringify({
      icons: [{
        src: 'icon.png',
        sizes: '96x96 128x128 192x192 256x256'
      }]
    });
    const manifest = manifestParser(manifestSrc).value;

    return assert.equal(Audit.audit({manifest}).value, true);
  });
});
