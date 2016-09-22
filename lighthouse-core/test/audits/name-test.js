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

const Audit = require('../../audits/manifest-name.js');
const assert = require('assert');
const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const manifestParser = require('../../lib/manifest-parser');

const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';
const exampleManifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);

/* global describe, it*/

describe('Manifest: name audit', () => {
  it('fails when no manifest artifact present', () => {
    return assert.equal(Audit.audit({Manifest: {
      value: undefined
    }}).rawValue, false);
  });

  it('fails when an empty manifest is present', () => {
    const artifacts = {
      Manifest: manifestParser('{}', EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL)
    };
    return assert.equal(Audit.audit(artifacts).rawValue, false);
  });

  it('fails when a manifest contains no name', () => {
    const artifacts = {
      Manifest: manifestParser(JSON.stringify({
        display: '/'
      }), EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL)
    };
    return assert.equal(Audit.audit(artifacts).rawValue, false);
  });

  it('succeeds when a minimal manifest contains a name', () => {
    const artifacts = {
      Manifest: manifestParser(JSON.stringify({
        name: 'Lighthouse PWA'
      }), EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL)
    };
    return assert.equal(Audit.audit(artifacts).rawValue, true);
  });

  it('succeeds when a complete manifest contains a name', () => {
    return assert.equal(Audit.audit({Manifest: exampleManifest}).rawValue, true);
  });
});
