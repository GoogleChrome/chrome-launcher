/**
 * @license
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

const Audit144 = require('../../audits/manifest-icons-min-144.js');
const Audit192 = require('../../audits/manifest-icons-min-192.js');
const assert = require('assert');
const manifestParser = require('../../lib/manifest-parser');
const exampleManifest = JSON.stringify(require('../fixtures/manifest.json'));

const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';

/* eslint-env mocha */

describe('Manifest: icons audits', () => {
  describe('icons exist check', () => {
    it('fails when a manifest contains no icons array', () => {
      const manifestSrc = JSON.stringify({
        name: 'NoIconsHere'
      });
      const Manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.equal(Audit144.audit({Manifest}).rawValue, false);
      assert.equal(Audit192.audit({Manifest}).rawValue, false);
    });

    it('fails when a manifest contains no icons', () => {
      const manifestSrc = JSON.stringify({
        icons: []
      });
      const Manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);

      const audit144 = Audit144.audit({Manifest});
      const audit192 = Audit192.audit({Manifest});

      assert.equal(audit144.rawValue, false);
      assert.ok(audit144.debugString.match(/^WARNING/));
      assert.equal(audit192.rawValue, false);
      assert.ok(audit192.debugString.match(/^WARNING/));
    });
  });

  describe('icons at least X size check', () => {
    it('fails when a manifest contains an icon with no size', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon.png'
        }]
      });
      const Manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);

      const audit144 = Audit144.audit({Manifest});
      const audit192 = Audit192.audit({Manifest});

      assert.equal(audit144.rawValue, false);
      assert.ok(audit144.debugString.match(/are at least 144px/));
      assert.equal(audit192.rawValue, false);
      assert.ok(audit192.debugString.match(/are at least 192px/));
    });

    it('succeeds when a manifest contains icons that are large enough', () => {
      // stub manifest contains a 192 icon
      const Manifest = manifestParser(exampleManifest, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.equal(Audit144.audit({Manifest}).rawValue, true);
      assert.equal(Audit192.audit({Manifest}).rawValue, true);
    });

    it('succeeds when there\'s one icon with multiple sizes, and one is valid', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon.png',
          sizes: '72x72 96x96 128x128 256x256'
        }]
      });
      const Manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);

      const audit144 = Audit144.audit({Manifest});
      const audit192 = Audit192.audit({Manifest});

      assert.equal(audit144.rawValue, true);
      assert.ok(audit144.displayValue);
      assert.equal(audit192.rawValue, true);
      assert.ok(audit192.displayValue);
    });

    it('succeeds when there\'s two icons, one without sizes; the other with a valid size', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon.png'
        }, {
          src: 'icon2.png',
          sizes: '256x256'
        }]
      });
      const Manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.equal(Audit144.audit({Manifest}).rawValue, true);
      assert.equal(Audit192.audit({Manifest}).rawValue, true);
    });

    it('fails when an icon has a valid size, though it\'s non-square.', () => {
      // See also: https://code.google.com/p/chromium/codesearch#chromium/src/chrome/browser/banners/app_banner_data_fetcher_unittest.cc&sq=package:chromium&type=cs&q=%22Non-square%20is%20okay%22%20file:%5Esrc/chrome/browser/banners/
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon-non-square.png',
          sizes: '200x220'
        }]
      });
      const Manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.equal(Audit144.audit({Manifest}).rawValue, false);
      assert.equal(Audit192.audit({Manifest}).rawValue, false);
    });
  });
});
