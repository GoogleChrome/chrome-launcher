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

const Audit144 = require('../../../src/audits/manifest-icons-min-144.js');
const Audit192 = require('../../../src/audits/manifest-icons-min-192.js');
const assert = require('assert');
const manifestParser = require('../../../src/lib/manifest-parser');

/* global describe, it*/

describe('Manifest: icons audits', () => {
  describe('icons exist check', () => {
    it('fails when a manifest contains no icons array', () => {
      const manifestSrc = JSON.stringify({
        name: 'NoIconsHere'
      });
      const Manifest = manifestParser(manifestSrc);
      assert.equal(Audit144.audit({Manifest}).value, false);
      assert.equal(Audit192.audit({Manifest}).value, false);
    });

    it('fails when a manifest contains no icons', () => {
      const manifestSrc = JSON.stringify({
        icons: []
      });
      const Manifest = manifestParser(manifestSrc);
      assert.equal(Audit144.audit({Manifest}).value, false);
      assert.equal(Audit192.audit({Manifest}).value, false);
    });
  });

  describe('icons at least X size check', () => {
    it('fails when a manifest contains an icon with no size', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon.png'
        }]
      });
      const Manifest = manifestParser(manifestSrc);

      assert.equal(Audit144.audit({Manifest}).value, false);
      assert.equal(Audit192.audit({Manifest}).value, false);
    });

    it('succeeds when a manifest contains icons that are large enough', () => {
      // stub manifest contains a 192 icon
      const manifestSrc = JSON.stringify(require('../../fixtures/manifest.json'));
      const Manifest = manifestParser(manifestSrc);
      assert.equal(Audit144.audit({Manifest}).value, true);
      assert.equal(Audit192.audit({Manifest}).value, true);
    });

    it('succeeds when there\'s one icon with multiple sizes, and one is valid', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon.png',
          sizes: '72x72 96x96 128x128 256x256'
        }]
      });
      const Manifest = manifestParser(manifestSrc);

      assert.equal(Audit144.audit({Manifest}).value, true);
      assert.equal(Audit192.audit({Manifest}).value, true);
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
      const Manifest = manifestParser(manifestSrc);
      assert.equal(Audit144.audit({Manifest}).value, true);
      assert.equal(Audit192.audit({Manifest}).value, true);
    });

    it('fails when an icon has a valid size, though it\'s non-square.', () => {
      // See also: https://code.google.com/p/chromium/codesearch#chromium/src/chrome/browser/banners/app_banner_data_fetcher_unittest.cc&sq=package:chromium&type=cs&q=%22Non-square%20is%20okay%22%20file:%5Esrc/chrome/browser/banners/
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon-non-square.png',
          sizes: '200x220'
        }]
      });
      const Manifest = manifestParser(manifestSrc);
      assert.equal(Audit144.audit({Manifest}).value, false);
      assert.equal(Audit192.audit({Manifest}).value, false);
    });
  });
});
