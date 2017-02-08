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

const ManifestExistsAudit = require('../../audits/manifest-exists.js');
const assert = require('assert');

const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const manifestParser = require('../../lib/manifest-parser');

const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';
const exampleManifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);

/* eslint-env mocha */

describe('Manifest: exists audit', () => {
  it('fails with no debugString if page had no manifest', () => {
    const result = ManifestExistsAudit.audit({
      Manifest: null
    });
    assert.strictEqual(result.rawValue, false);
    assert.strictEqual(result.debugString, undefined);
  });

  it('succeeds with a valid minimal manifest', () => {
    const artifacts = {
      Manifest: manifestParser('{}', EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL)
    };
    const output = ManifestExistsAudit.audit(artifacts);
    assert.equal(output.rawValue, true);
    assert.equal(output.debugString, undefined);
  });

  it('succeeds with a valid minimal manifest', () => {
    const artifacts = {
      Manifest: manifestParser(JSON.stringify({
        name: 'Lighthouse PWA'
      }), EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL)
    };
    const output = ManifestExistsAudit.audit(artifacts);
    assert.equal(output.rawValue, true);
    assert.equal(output.debugString, undefined);
  });

  it('correctly passes through debug strings', () => {
    const debugString = 'No href found on <link rel="manifest">.';

    assert.equal(ManifestExistsAudit.audit({
      Manifest: {
        value: {},
        debugString
      }
    }).debugString, debugString);
  });

  it('correctly passes through a JSON parsing failure', () => {
    const artifacts = {
      Manifest: manifestParser('{ \name: Definitely not valid JSON }', EXAMPLE_MANIFEST_URL,
          EXAMPLE_DOC_URL)
    };
    const output = ManifestExistsAudit.audit(artifacts);
    assert.equal(output.rawValue, false);
    assert.ok(output.debugString.includes('Unexpected token'), 'No JSON error message');
  });

  it('succeeds with a complete manifest', () => {
    return assert.equal(ManifestExistsAudit.audit({Manifest: exampleManifest}).rawValue, true);
  });
});
