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
const Audit = require('../../audits/manifest-exists.js');
const assert = require('assert');

const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const manifestParser = require('../../lib/manifest-parser');
const exampleManifest = manifestParser(manifestSrc);

/* global describe, it*/

describe('Manifest: exists audit', () => {
  it('fails when no manifest artifact present', () => {
    return assert.equal(Audit.audit({Manifest: {
      value: undefined
    }}).rawValue, false);
  });

  it('succeeds when a manifest artifact is present', () => {
    return assert.equal(Audit.audit({Manifest: {
      value: {}
    }}).rawValue, true);
  });

  it('succeeds when a minimal manifest contains a valid background_color', () => {
    const artifacts = {
      Manifest: manifestParser(JSON.stringify({
        name: 'Lighthouse PWA'
      }))
    };
    return assert.equal(Audit.audit(artifacts).rawValue, true);
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

  it('succeeds with a complete manifest', () => {
    return assert.equal(Audit.audit({Manifest: exampleManifest}).rawValue, true);
  });
});
