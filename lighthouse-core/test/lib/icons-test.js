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

const icons = require('../../lib/icons');
const assert = require('assert');
const manifestParser = require('../../lib/manifest-parser');

const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';

/* global describe, it */
describe('Icons helper', () => {
  describe('icons exist check', () => {
    it('copes when no manifest is provided', () => {
      return assert.equal(icons.doExist(), false);
    });

    it('fails when a manifest contains no icons array', () => {
      const manifestSrc = JSON.stringify({
        name: 'NoIconsHere'
      });
      const manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);

      assert.equal(icons.doExist(manifest.value), false);
    });

    it('fails when a manifest contains no icons', () => {
      const manifestSrc = JSON.stringify({
        icons: []
      });
      const manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.equal(icons.doExist(manifest.value), false);
    });

    it('succeed when a manifest contains icons', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon.png'
        }]
      });
      const manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.equal(icons.doExist(manifest.value), true);
    });
  });

  describe('icons at least X size check', () => {
    it('succeeds when a manifest icon that equals the requirements', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon192.png',
          sizes: '192x192'
        }]
      });
      const manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      // /* manifest looks like this: */
      // {
      //   icons: {
      //     value: [{
      //       raw: { src: 'icon.png', sizes: '192x192' },
      //       value: {
      //         src: { raw: 'icon.png', value: 'icon.png' },
      //         density: { raw: undefined, value: 1 },
      //         sizes: { raw: '192x192', value: ['192x192'] }
      //       }
      //     }]
      //   }
      // };
      assert.equal(icons.sizeAtLeast(192, manifest.value).length, 1);
    });

    it('fails when a manifest contains an icon with no size', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon-no-size.png'
        }]
      });
      const manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.equal(icons.sizeAtLeast(192, manifest.value).length, 0);
    });

    it('succeeds when a manifest icon exceeds the requirements', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon-192.png',
          sizes: '192x192'
        }]
      });
      const manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.equal(icons.sizeAtLeast(144, manifest.value).length, 1);
    });

    it('fails when a manifest icon doesn\'t meet the requirements', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon-192.png',
          sizes: '192x192'
        }]
      });
      const manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.equal(icons.sizeAtLeast(256, manifest.value).length, 0);
    });

    it('succeeds when there\'s one icon with multiple sizes, and one is valid', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon.png',
          sizes: '72x72 96x96 128x128 256x256'
        }]
      });
      const manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.equal(icons.sizeAtLeast(192, manifest.value).length, 1);
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
      const manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.equal(icons.sizeAtLeast(192, manifest.value).length, 1);
    });

    it('fails when an icon has a valid size, though it\'s non-square.', () => {
      // See also: https://code.google.com/p/chromium/codesearch#chromium/src/chrome/browser/banners/app_banner_data_fetcher_unittest.cc&sq=package:chromium&type=cs&q=%22Non-square%20is%20okay%22%20file:%5Esrc/chrome/browser/banners/
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon-non-square.png',
          sizes: '200x220'
        }]
      });
      const manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.equal(icons.sizeAtLeast(192, manifest.value).length, 0);
    });

    it('fails when an icon uses an invalid string for its size', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: 'icon-vector.svg',
          sizes: 'any'
        }]
      });
      const manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.equal(icons.sizeAtLeast(192, manifest.value).length, 0);
    });
  });
});
