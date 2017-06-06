/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const SplashScreenAudit = require('../../audits/splash-screen');
const assert = require('assert');
const manifestParser = require('../../lib/manifest-parser');

const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';
const exampleManifest = noUrlManifestParser(manifestSrc);

const Runner = require('../../runner.js');

function generateMockArtifacts() {
  const computedArtifacts = Runner.instantiateComputedArtifacts();
  const mockArtifacts = Object.assign({}, computedArtifacts, {
    Manifest: exampleManifest
  });
  return mockArtifacts;
}

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
describe('PWA: splash screen audit', () => {
  describe('basics', () => {
    it('fails if page had no manifest', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest = null;

      return SplashScreenAudit.audit(artifacts).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.debugString.includes('No manifest was fetched'), result.debugString);
      });
    });

    it('fails with a non-parsable manifest', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest = manifestParser('{,:}', EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      return SplashScreenAudit.audit(artifacts).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.debugString.includes('failed to parse as valid JSON'));
      });
    });

    it('fails when an empty manifest is present', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest = manifestParser('{}', EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      return SplashScreenAudit.audit(artifacts).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.debugString);
        assert.strictEqual(result.extendedInfo.value.failures.length, 4);
      });
    });

    it('passes with complete manifest and SW', () => {
      return SplashScreenAudit.audit(generateMockArtifacts()).then(result => {
        assert.strictEqual(result.rawValue, true, result.debugString);
        assert.strictEqual(result.debugString, undefined, result.debugString);
      });
    });
  });

  describe('one-off-failures', () => {
    it('fails when a manifest contains no name', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest.value.name.value = undefined;

      return SplashScreenAudit.audit(artifacts).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.debugString.includes('name'), result.debugString);
      });
    });

    it('fails when a manifest contains no background color', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest.value.background_color.value = undefined;

      return SplashScreenAudit.audit(artifacts).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.debugString.includes('background_color'), result.debugString);
      });
    });

    it('fails when a manifest contains no background color', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest = noUrlManifestParser(JSON.stringify({
        background_color: 'no'
      }));

      return SplashScreenAudit.audit(artifacts).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.debugString.includes('background_color'), result.debugString);
      });
    });

    it('fails when a manifest contains no theme color', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest.value.theme_color.value = undefined;

      return SplashScreenAudit.audit(artifacts).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.debugString.includes('theme_color'), result.debugString);
      });
    });

    it('fails if page had no icons in the manifest', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest.value.icons.value = [];

      return SplashScreenAudit.audit(artifacts).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.debugString.includes('icons'), result.debugString);
      });
    });
  });
});
