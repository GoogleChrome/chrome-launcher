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

const ManifestStartUrlAudit = require('../../audits/manifest-start-url.js');
const assert = require('assert');
const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const manifestParser = require('../../lib/manifest-parser');

const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';
const exampleManifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);

/* eslint-env mocha */

describe('Manifest: start_url audit', () => {
  it('fails with no debugString if page had no manifest', () => {
    const result = ManifestStartUrlAudit.audit({
      Manifest: null,
    });
    assert.strictEqual(result.rawValue, false);
    assert.strictEqual(result.debugString, undefined);
  });

  it('fails when an empty manifest is present', () => {
    const artifacts = {
      Manifest: manifestParser('{}', EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL)
    };
    const output = ManifestStartUrlAudit.audit(artifacts);
    assert.equal(output.rawValue, true);
    assert.equal(output.debugString, undefined);
  });

  // Need to disable camelcase check for dealing with start_url.
  /* eslint-disable camelcase */
  it('fails when a manifest contains no start_url', () => {
    const artifacts = {
      Manifest: manifestParser(JSON.stringify({
        start_url: undefined
      }), EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL)
    };
    const output = ManifestStartUrlAudit.audit(artifacts);
    assert.equal(output.rawValue, true);
    assert.equal(output.debugString, undefined);
  });

  it('succeeds when a minimal manifest contains a start_url', () => {
    const artifacts = {
      Manifest: manifestParser(JSON.stringify({
        start_url: '/'
      }), EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL)
    };
    const output = ManifestStartUrlAudit.audit(artifacts);
    assert.equal(output.rawValue, true);
    assert.equal(output.debugString, undefined);
  });
  /* eslint-enable camelcase */

  it('succeeds when a complete manifest contains a start_url', () => {
    return assert.equal(ManifestStartUrlAudit.audit({Manifest: exampleManifest}).rawValue, true);
  });
});
