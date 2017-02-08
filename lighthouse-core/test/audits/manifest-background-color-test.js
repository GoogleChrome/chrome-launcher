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

const ManifestBackgroundColorAudit = require('../../audits/manifest-background-color.js');
const assert = require('assert');
const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const manifestParser = require('../../lib/manifest-parser');
const exampleManifest = manifestParser(manifestSrc, 'https://example.com/', 'https://example.com/');

const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';

/**
 * Simple manifest parsing helper when the manifest URLs aren't material to the
 * test. Uses example.com URLs for testing.
 * @param {string} manifestSrc
 * @return {!ManifestNode<(!Manifest|undefined)>}
 */
function noUrlManifestParser(manifestSrc) {
  return manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
}

/* eslint-env mocha */

// Need to disable camelcase check for dealing with background_color.
/* eslint-disable camelcase */
describe('Manifest: background color audit', () => {
  it('fails with no debugString if page had no manifest', () => {
    const result = ManifestBackgroundColorAudit.audit({
      Manifest: null
    });
    assert.strictEqual(result.rawValue, false);
    assert.strictEqual(result.debugString, undefined);
  });

  it('fails when an empty manifest is present', () => {
    const artifacts = {
      Manifest: noUrlManifestParser('{}')
    };
    return assert.equal(ManifestBackgroundColorAudit.audit(artifacts).rawValue, false);
  });

  it('fails when a minimal manifest contains no background_color', () => {
    const artifacts = {
      Manifest: noUrlManifestParser(JSON.stringify({
        start_url: '/'
      }))
    };
    const output = ManifestBackgroundColorAudit.audit(artifacts);
    assert.equal(output.rawValue, false);
    assert.equal(output.debugString, undefined);
  });

  it('fails when a minimal manifest contains an invalid background_color', () => {
    const artifacts = {
      Manifest: noUrlManifestParser(JSON.stringify({
        background_color: 'no'
      }))
    };
    const output = ManifestBackgroundColorAudit.audit(artifacts);
    assert.equal(output.rawValue, false);
    assert.equal(output.debugString, undefined);
  });

  it('succeeds when a minimal manifest contains a valid background_color', () => {
    const artifacts = {
      Manifest: noUrlManifestParser(JSON.stringify({
        background_color: '#FAFAFA'
      }))
    };
    const output = ManifestBackgroundColorAudit.audit(artifacts);
    assert.equal(output.rawValue, true);
    assert.equal(output.extendedInfo.value, '#FAFAFA');
  });

  it('succeeds when a complete manifest contains a background_color', () => {
    const result = ManifestBackgroundColorAudit.audit({Manifest: exampleManifest});
    return assert.equal(result.rawValue, true);
  });
});
/* eslint-enable */
