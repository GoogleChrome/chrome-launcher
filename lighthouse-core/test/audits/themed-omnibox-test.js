/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ThemedOmniboxAudit = require('../../audits/themed-omnibox');
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
    Manifest: exampleManifest,
    ThemeColor: '#bada55'
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
describe('PWA: themed omnibox audit', () => {
  it('fails if page had no manifest', () => {
    const artifacts = generateMockArtifacts();
    artifacts.Manifest = null;

    return ThemedOmniboxAudit.audit(artifacts).then(result => {
      assert.strictEqual(result.rawValue, false);
      assert.ok(result.debugString.includes('No manifest was fetched'), result.debugString);
    });
  });

  // Need to disable camelcase check for dealing with theme_color.
  /* eslint-disable camelcase */
  it('fails when a minimal manifest contains no theme_color', () => {
    const artifacts = generateMockArtifacts();
    artifacts.Manifest = noUrlManifestParser(JSON.stringify({
      start_url: '/'
    }));

    return ThemedOmniboxAudit.audit(artifacts).then(result => {
      assert.equal(result.rawValue, false);
      assert.ok(result.debugString);
    });
  });

  it('succeeds when a minimal manifest contains a theme_color', () => {
    const artifacts = generateMockArtifacts();
    artifacts.Manifest = noUrlManifestParser(JSON.stringify({
      theme_color: '#bada55'
    }));
    return ThemedOmniboxAudit.audit(artifacts).then(result => {
      assert.equal(result.rawValue, true);
      assert.equal(result.debugString, undefined);
    });
  });

  /* eslint-enable camelcase */
  it('succeeds when a complete manifest contains a theme_color', () => {
    const artifacts = generateMockArtifacts();
    return ThemedOmniboxAudit.audit(artifacts).then(result => {
      assert.equal(result.rawValue, true);
      assert.equal(result.debugString, undefined);
    });
  });

  it('fails and warns when no theme-color meta tag found', () => {
    const artifacts = generateMockArtifacts();
    artifacts.ThemeColor = null;
    return ThemedOmniboxAudit.audit(artifacts).then(result => {
      assert.equal(result.rawValue, false);
      assert.ok(result.debugString);
    });
  });

  it('fails and warns when theme-color has an invalid CSS color', () => {
    const artifacts = generateMockArtifacts();
    artifacts.ThemeColor = '#1234567';
    return ThemedOmniboxAudit.audit(artifacts).then(result => {
      assert.equal(result.rawValue, false);
      assert.ok(result.debugString.includes('valid CSS color'));
    });
  });

  it('succeeds when theme-color present in the html', () => {
    const artifacts = generateMockArtifacts();
    artifacts.ThemeColor = '#fafa33';
    return ThemedOmniboxAudit.audit(artifacts).then(result => {
      assert.equal(result.rawValue, true);
      assert.equal(result.debugString, undefined);
    });
  });

  it('succeeds when theme-color has a CSS nickname content value', () => {
    const artifacts = generateMockArtifacts();
    artifacts.ThemeColor = 'red';
    return ThemedOmniboxAudit.audit(artifacts).then(result => {
      assert.equal(result.rawValue, true);
      assert.equal(result.debugString, undefined);
    });
  });


  it('fails if HTML theme color is good, but manifest themecolor is bad', () => {
    const artifacts = generateMockArtifacts();
    artifacts.Manifest = noUrlManifestParser(JSON.stringify({
      start_url: '/'
    }));
    return ThemedOmniboxAudit.audit(artifacts).then(result => {
      assert.equal(result.rawValue, false);
      assert.ok(result.debugString.includes('does not have `theme_color`'), result.debugString);
    });
  });

  it('fails if HTML theme color is bad, and manifest themecolor is good', () => {
    const artifacts = generateMockArtifacts();
    artifacts.ThemeColor = 'not a color';
    return ThemedOmniboxAudit.audit(artifacts).then(result => {
      assert.equal(result.rawValue, false);
      assert.ok(result.debugString.includes('theme-color meta tag'), result.debugString);
    });
  });
});
