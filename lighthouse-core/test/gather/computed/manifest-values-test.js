/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const ManifestValues = require('../../../gather/computed/manifest-values');
const assert = require('assert');

const manifestSrc = JSON.stringify(require('../../fixtures/manifest.json'));
const manifestParser = require('../../../lib/manifest-parser');

const manifestValues = new ManifestValues();

/**
 * Simple manifest parsing helper when the manifest URLs aren't material to the
 * test. Uses example.com URLs for testing.
 * @param {string} manifestSrc
 * @return {!ManifestNode<(!Manifest|undefined)>}
 */
function noUrlManifestParser(manifestSrc) {
  const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
  const EXAMPLE_DOC_URL = 'https://example.com/index.html';

  return manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
}

/* eslint-env mocha */
describe('ManifestValues computed artifact', () => {
  it('reports a parse failure if page had no manifest', () => {
    const manifestArtifact = null;
    const results = manifestValues.compute_(manifestArtifact);
    assert.equal(results.isParseFailure, true);
    assert.ok(results.parseFailureReason, 'No manifest was fetched');
    assert.equal(results.allChecks.length, 0);
  });

  it('reports a parse failure if page had an unparseable manifest', () => {
    const manifestArtifact = noUrlManifestParser('{:,}');
    const results = manifestValues.compute_(manifestArtifact);
    assert.equal(results.isParseFailure, true);
    assert.ok(results.parseFailureReason.includes('failed to parse as valid JSON'));
    assert.equal(results.allChecks.length, 0);
  });

  it('passes the parsing checks on an empty manifest', () => {
    const manifestArtifact = noUrlManifestParser('{}');
    const results = manifestValues.compute_(manifestArtifact);
    assert.equal(results.isParseFailure, false);
    assert.equal(results.parseFailureReason, undefined);
  });

  it('passes the all checks with fixture manifest', () => {
    const manifestArtifact = noUrlManifestParser(manifestSrc);
    const results = manifestValues.compute_(manifestArtifact);
    assert.equal(results.isParseFailure, false);
    assert.equal(results.parseFailureReason, undefined);

    assert.equal(results.allChecks.length, ManifestValues.manifestChecks.length);
    assert.equal(results.allChecks.every(i => i.passing), true, 'not all checks passed');
  });

  describe('color checks', () => {
    it('fails when a minimal manifest contains no background_color', () => {
      const Manifest = noUrlManifestParser(JSON.stringify({
        start_url: '/'
      }));
      const results = manifestValues.compute_(Manifest);
      const colorResults = results.allChecks.filter(i => i.id.includes('Color'));
      assert.equal(colorResults.every(i => i.passing === false), true);
    });

    it('fails when a minimal manifest contains an invalid background_color', () => {
      const Manifest = noUrlManifestParser(JSON.stringify({
        background_color: 'no',
        theme_color: 'no'
      }));

      const results = manifestValues.compute_(Manifest);
      const colorResults = results.allChecks.filter(i => i.id.includes('Color'));
      assert.equal(colorResults.every(i => i.passing === false), true);
    });

    it('succeeds when a minimal manifest contains a valid background_color', () => {
      const Manifest = noUrlManifestParser(JSON.stringify({
        background_color: '#FAFAFA',
        theme_color: '#FAFAFA'
      }));

      const results = manifestValues.compute_(Manifest);
      const colorResults = results.allChecks.filter(i => i.id.includes('Color'));
      assert.equal(colorResults.every(i => i.passing === true), true);
    });
  });

  describe('hasPWADisplayValue', () => {
    const check = ManifestValues.manifestChecks.find(i => i.id === 'hasPWADisplayValue');

    it('passes accepted values', () => {
      let Manifest;
      Manifest = noUrlManifestParser(JSON.stringify({display: 'minimal-ui'}));
      assert.equal(check.validate(Manifest), true, 'doesnt pass minimal-ui');
      Manifest = noUrlManifestParser(JSON.stringify({display: 'standalone'}));
      assert.equal(check.validate(Manifest), true, 'doesnt pass standalone');
      Manifest = noUrlManifestParser(JSON.stringify({display: 'fullscreen'}));
      assert.equal(check.validate(Manifest), true, 'doesnt pass fullscreen');
    });
    it('fails invalid values', () => {
      let Manifest;
      Manifest = noUrlManifestParser(JSON.stringify({display: 'display'}));
      assert.equal(check.validate(Manifest), false, 'doesnt fail display');
      Manifest = noUrlManifestParser(JSON.stringify({display: ''}));
      assert.equal(check.validate(Manifest), false, 'doesnt fail empty string');
    });
  });

  describe('icons checks', () => {
    describe('icons exist check', () => {
      it('fails when a manifest contains no icons array', () => {
        const manifestSrc = JSON.stringify({
          name: 'NoIconsHere'
        });
        const Manifest = noUrlManifestParser(manifestSrc);
        const results = manifestValues.compute_(Manifest);
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));
        assert.equal(iconResults.every(i => i.passing === false), true);
      });

      it('fails when a manifest contains no icons', () => {
        const manifestSrc = JSON.stringify({
          icons: []
        });
        const Manifest = noUrlManifestParser(manifestSrc);
        const results = manifestValues.compute_(Manifest);
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));
        assert.equal(iconResults.every(i => i.passing === false), true);
      });
    });

    describe('icons at least X size check', () => {
      it('fails when a manifest contains an icon with no size', () => {
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon.png'
          }]
        });
        const Manifest = noUrlManifestParser(manifestSrc);
        const results = manifestValues.compute_(Manifest);
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));

        assert.equal(iconResults.every(i => i.passing === false), true);
      });

      it('succeeds when there\'s one icon with multiple sizes, and one is valid', () => {
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon.png',
            sizes: '72x72 96x96 128x128 256x256 1024x1024'
          }]
        });
        const Manifest = noUrlManifestParser(manifestSrc);
        const results = manifestValues.compute_(Manifest);
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));

        assert.equal(iconResults.every(i => i.passing === true), true);
      });

      it('succeeds when there\'s two icons, one without sizes; the other with a valid size', () => {
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon.png'
          }, {
            src: 'icon2.png',
            sizes: '1256x1256'
          }]
        });
        const Manifest = noUrlManifestParser(manifestSrc);
        const results = manifestValues.compute_(Manifest);
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));

        assert.equal(iconResults.every(i => i.passing === true), true);
      });

      it('fails when an icon has a valid size, though it\'s non-square.', () => {
        // See also: https://code.google.com/p/chromium/codesearch#chromium/src/chrome/browser/banners/app_banner_data_fetcher_unittest.cc&sq=package:chromium&type=cs&q=%22Non-square%20is%20okay%22%20file:%5Esrc/chrome/browser/banners/
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon-non-square.png',
            sizes: '200x220'
          }]
        });
        const Manifest = noUrlManifestParser(manifestSrc);
        const results = manifestValues.compute_(Manifest);
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));

        assert.equal(iconResults.every(i => i.passing === false), true);
      });
    });
  });
});
