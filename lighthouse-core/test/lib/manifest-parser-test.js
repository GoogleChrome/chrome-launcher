/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const manifestParser = require('../../lib/manifest-parser');
const assert = require('assert');
const manifestStub = require('../fixtures/manifest.json');

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

describe('Manifest Parser', function() {
  it('should not parse empty string input', function() {
    const parsedManifest = noUrlManifestParser('');
    assert.ok(parsedManifest.debugString);
  });

  it('accepts empty dictionary', function() {
    const parsedManifest = noUrlManifestParser('{}');
    assert(!parsedManifest.debugString);
    assert.equal(parsedManifest.value.name.value, undefined);
    assert.equal(parsedManifest.value.short_name.value, undefined);
    assert.equal(parsedManifest.value.start_url.value, EXAMPLE_DOC_URL);
    assert.equal(parsedManifest.value.display.value, 'browser');
    assert.equal(parsedManifest.value.orientation.value, undefined);
    assert.equal(parsedManifest.value.theme_color.value, undefined);
    assert.equal(parsedManifest.value.background_color.value, undefined);
    assert.ok(Array.isArray(parsedManifest.value.icons.value));
    assert.ok(parsedManifest.value.icons.value.length === 0);
    // TODO:
    // related_applications
    // prefer_related_applications
  });

  describe('icon parsing', function() {
    // 9.7
    it('gives an empty array and an error for erroneous icons entry', () => {
      const parsedManifest = manifestParser('{"icons": {"16": "img/icons/icon16.png"}}',
          EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.ok(!parsedManifest.debugString);
      const icons = parsedManifest.value.icons;
      assert.ok(Array.isArray(icons.value));
      assert.equal(icons.value.length, 0);
      assert.ok(icons.debugString);
    });

    it('gives an empty array and no error for missing icons entry', () => {
      const parsedManifest = manifestParser('{}',
          EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert.ok(!parsedManifest.debugString);
      const icons = parsedManifest.value.icons;
      assert.ok(Array.isArray(icons.value));
      assert.equal(icons.value.length, 0);
      assert.ok(!icons.debugString);
    });

    it('parses basic string', function() {
      const parsedManifest = manifestParser('{"icons": [{"src": "192.png", "sizes": "192x192"}]}',
          EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      assert(!parsedManifest.debugString);
      const icons = parsedManifest.value.icons;
      assert(!icons.debugString);
      const icon192 = icons.value[0];
      assert(!icon192.value.sizes.debugString);
      assert.equal(icons.value.length, 1);
    });

    it('finds three icons in the stub manifest', function() {
      const parsedManifest = manifestParser(JSON.stringify(manifestStub), EXAMPLE_MANIFEST_URL,
          EXAMPLE_DOC_URL);
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.icons.value.length, 3);
    });

    it('parses icons with extra whitespace', function() {
      const manifest = '{"icons": [{"src": "192.png", "sizes": " 192x192   256x256"}]}';
      const parsedManifest = manifestParser(manifest, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      const icons = parsedManifest.value.icons;
      const icon192 = icons.value[0];
      const icon192Sizes = icon192.value.sizes.value;
      assert.equal(icon192Sizes[0], '192x192');
      assert.equal(icon192Sizes[1], '256x256');
    });

    it('parses icons and discards any with invalid src values', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: {}
        }, {
          src: 17
        }]
      });
      const parsedManifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      const icons = parsedManifest.value.icons;
      assert.equal(icons.value.length, 0);
    });

    it('parses icons and discards any with undefined or empty string src values', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: ''
        }, {}]
      });
      const parsedManifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      const icons = parsedManifest.value.icons;
      assert.equal(icons.value.length, 0);
    });

    it('constructs icon URLs relative to manifest URL ', () => {
      const manifestSrc = JSON.stringify({
        icons: [{
          src: '../cool.gif'
        }]
      });
      const manifestUrl = 'https://example.com/resources/manifest.webmanifest';
      const parsedManifest = manifestParser(manifestSrc, manifestUrl, EXAMPLE_DOC_URL);
      const icons = parsedManifest.value.icons;
      assert.equal(icons.value.length, 1);
      const icon = icons.value[0].value;
      assert.equal(icon.src.value, 'https://example.com/cool.gif');
    });
  });

  describe('name parsing', function() {
    it('parses basic string', function() {
      const parsedManifest = noUrlManifestParser('{"name":"foo"}');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.name.value, 'foo');
    });

    it('trims whitespaces', function() {
      const parsedManifest = noUrlManifestParser('{"name":" foo "}');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.name.value, 'foo');
    });

    it('doesn\'t parse non-string', function() {
      let parsedManifest = noUrlManifestParser('{"name": {} }');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.name.value, undefined);

      parsedManifest = noUrlManifestParser('{"name": 42 }');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.name.value, undefined);
    });
  });

  describe('short_name parsing', function() {
    it('parses basic string', function() {
      const parsedManifest = noUrlManifestParser('{"short_name":"foo"}');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.short_name.value, 'foo');
    });

    it('trims whitespaces', function() {
      const parsedManifest = noUrlManifestParser('{"short_name":" foo "}');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.short_name.value, 'foo');
    });

    it('doesn\'t parse non-string', function() {
      let parsedManifest = noUrlManifestParser('{"short_name": {} }');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.short_name.value, undefined);

      parsedManifest = noUrlManifestParser('{"short_name": 42 }');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.short_name.value, undefined);
    });
  });

  /**
   * @see https://w3c.github.io/manifest/#start_url-member
   */
  describe('start_url parsing', () => {
    /* eslint-disable camelcase */
    // 8.10(3)
    it('falls back to document URL and issues a warning for an invalid value', () => {
      const manifestSrc = JSON.stringify({
        start_url: {}
      });
      const manifestUrl = 'https://example.com/manifest.json';
      const docUrl = 'https://example.com/index.html';

      const parsedManifest = manifestParser(manifestSrc, manifestUrl, docUrl);
      const parsedUrl = parsedManifest.value.start_url;
      assert.ok(parsedUrl.debugString);
      assert.equal(parsedUrl.value, docUrl);
    });

    it('falls back to document URL and issues a warning for an invalid value', () => {
      const manifestSrc = JSON.stringify({
        start_url: 6
      });
      const manifestUrl = 'https://example.com/manifest.json';
      const docUrl = 'https://example.com/index.html';

      const parsedManifest = manifestParser(manifestSrc, manifestUrl, docUrl);
      const parsedUrl = parsedManifest.value.start_url;
      assert.ok(parsedUrl.debugString);
      assert.equal(parsedUrl.value, docUrl);
    });

    it('falls back to document URL and issues a warning for an empty string', () => {
      const manifestSrc = JSON.stringify({
        start_url: ''
      });
      const manifestUrl = 'https://example.com/manifest.json';
      const docUrl = 'https://example.com/index.html';

      const parsedManifest = manifestParser(manifestSrc, manifestUrl, docUrl);
      const parsedUrl = parsedManifest.value.start_url;
      assert.ok(parsedUrl.debugString);
      assert.equal(parsedUrl.value, docUrl);
    });

    it('falls back to document URL and issues no warning when undefined', () => {
      const manifestSrc = JSON.stringify({});
      const manifestUrl = 'https://example.com/manifest.json';
      const docUrl = 'https://example.com/index.html';

      const parsedManifest = manifestParser(manifestSrc, manifestUrl, docUrl);
      const parsedUrl = parsedManifest.value.start_url;
      assert.ok(!parsedUrl.debugString);
      assert.equal(parsedUrl.value, docUrl);
    });

    // TODO(bckenny): run these tests when we have a proper URL parser:
    // https://github.com/GoogleChrome/lighthouse/issues/602
    // 8.10(5)
    it.skip('falls back to document URL and issues a warning for an invalid URL', () => {
      // `new URL('/manifest.json', '')` is invalid and will throw.
      const manifestSrc = JSON.stringify({
        start_url: '/manifest.json'
      });
      const manifestUrl = '';
      const docUrl = 'https://example.com/index.html';

      const parsedManifest = manifestParser(manifestSrc, manifestUrl, docUrl);
      const parsedUrl = parsedManifest.value.start_url;
      assert.ok(parsedUrl.debugString);
      assert.equal(parsedUrl.value, docUrl);
    });

    // 8.10(6)
    it('falls back to document URL with warning when on different domain from document URL', () => {
      const manifestSrc = JSON.stringify({
        start_url: 'https://evil.com/index.html'
      });
      const manifestUrl = 'https://example.com/manifest.json';
      const docUrl = 'https://example.com/index.html';

      const parsedManifest = manifestParser(manifestSrc, manifestUrl, docUrl);
      const parsedUrl = parsedManifest.value.start_url;
      assert.ok(parsedUrl.debugString);
      assert.equal(parsedUrl.value, docUrl);
    });

    it('falls back to document URL with warning when on different port from document URL', () => {
      const manifestSrc = JSON.stringify({
        start_url: 'https://example.com:314/index.html'
      });
      const manifestUrl = 'https://example.com/manifest.json';
      const docUrl = 'https://example.com:8080/index.html';

      const parsedManifest = manifestParser(manifestSrc, manifestUrl, docUrl);
      const parsedUrl = parsedManifest.value.start_url;
      assert.ok(parsedUrl.debugString);
      assert.equal(parsedUrl.value, docUrl);
    });

    it('falls back to document URL with warning when on different scheme from document URL', () => {
      const manifestSrc = JSON.stringify({
        start_url: 'http://example.com/index.html'
      });
      const manifestUrl = 'https://example.com/manifest.json';
      const docUrl = 'https://example.com/index.html';

      const parsedManifest = manifestParser(manifestSrc, manifestUrl, docUrl);
      const parsedUrl = parsedManifest.value.start_url;
      assert.ok(parsedUrl.debugString);
      assert.equal(parsedUrl.value, docUrl);
    });

    it('correctly parses a start_url of "/" relative to the manifest\'s url', () => {
      const manifestSrc = JSON.stringify({
        start_url: '/'
      });
      const manifestUrl = 'https://example.com/manifest.json';
      const docUrl = 'https://example.com/index.html';

      const parsedManifest = manifestParser(manifestSrc, manifestUrl, docUrl);
      const parsedUrl = parsedManifest.value.start_url;
      assert.ok(!parsedUrl.debugString);
      assert.equal(parsedUrl.value, 'https://example.com/');
    });

    it('correctly parses a start_url relative to the manifest\'s url', () => {
      // from non-normative example in spec
      const manifestSrc = JSON.stringify({
        start_url: '../start_point.html'
      });
      const manifestUrl = 'https://example.com/resources/manifest.webmanifest';
      const docUrl = 'https://example.com/index.html';

      const parsedManifest = manifestParser(manifestSrc, manifestUrl, docUrl);
      const parsedUrl = parsedManifest.value.start_url;
      assert.ok(!parsedUrl.debugString);
      assert.equal(parsedUrl.value, 'https://example.com/start_point.html');
    });
    /* eslint-enable camelcase */
  });

  /**
   * @see https://w3c.github.io/manifest/#display-member
   */
  describe('display parsing', () => {
    it('falls back to \'browser\' and issues a warning for an invalid value', () => {
      const parsedManifest = noUrlManifestParser('{"display": {} }');
      const display = parsedManifest.value.display;
      assert.ok(display.debugString);
      assert.equal(display.value, 'browser');
    });

    it('falls back to \'browser\' and issues a warning for an invalid value', () => {
      const parsedManifest = noUrlManifestParser('{"display": 5 }');
      const display = parsedManifest.value.display;
      assert.ok(display.debugString);
      assert.equal(display.value, 'browser');
    });

    it('falls back to \'browser\' and issues no warning when undefined', () => {
      const parsedManifest = noUrlManifestParser('{}');
      const display = parsedManifest.value.display;
      assert.ok(!display.debugString);
      assert.equal(display.value, 'browser');
      assert.equal(display.rawValue, undefined);
    });

    it('trims whitespace', () => {
      const displayValue = ' fullscreen     ';
      const parsedManifest = noUrlManifestParser(`{"display": "${displayValue}" }`);
      const display = parsedManifest.value.display;
      assert.ok(!display.debugString);
      assert.equal(display.value, 'fullscreen');
    });

    it('converts to lowercase', () => {
      const displayValue = 'fUlLScrEEn';
      const parsedManifest = noUrlManifestParser(`{"display": "${displayValue}" }`);
      const display = parsedManifest.value.display;
      assert.ok(!display.debugString);
      assert.equal(display.value, 'fullscreen');
    });

    it('falls back to \'browser\' and issues a warning when a non-existent mode', () => {
      const parsedManifest = noUrlManifestParser('{"display": "fullestscreen" }');
      const display = parsedManifest.value.display;
      assert.ok(display.debugString);
      assert.equal(display.value, 'browser');
    });

    it('correctly parses `fullscreen` display mode', () => {
      const parsedManifest = noUrlManifestParser('{"display": "fullscreen" }');
      const display = parsedManifest.value.display;
      assert.ok(!display.debugString);
      assert.equal(display.value, 'fullscreen');
    });

    it('correctly parses `standalone` display mode', () => {
      const parsedManifest = noUrlManifestParser('{"display": "standalone" }');
      const display = parsedManifest.value.display;
      assert.ok(!display.debugString);
      assert.equal(display.value, 'standalone');
    });

    it('correctly parses `minimal-ui` display mode', () => {
      const parsedManifest = noUrlManifestParser('{"display": "minimal-ui" }');
      const display = parsedManifest.value.display;
      assert.ok(!display.debugString);
      assert.equal(display.value, 'minimal-ui');
    });

    it('correctly parses `browser` display mode', () => {
      const parsedManifest = noUrlManifestParser('{"display": "browser" }');
      const display = parsedManifest.value.display;
      assert.ok(!display.debugString);
      assert.equal(display.value, 'browser');
    });
  });

  /**
   * @see https://w3c.github.io/manifest/#related_applications-member
   */
  describe('related_applications parsing', () => {
    it('correctly parses the urls from an example manifest', () => {
      /* eslint-disable camelcase */
      // non normative-example from section 10
      const exampleManifest = {
        related_applications: [{
          platform: 'play',
          url: 'https://play.google.com/store/apps/details?id=com.example.app1',
          id: 'com.example.app1'
        }, {
          platform: 'itunes',
          url: 'https://itunes.apple.com/app/example-app1/id123456789'
        }]
      };
      /* eslint-enable camelcase */

      const parsedManifest = manifestParser(JSON.stringify(exampleManifest), EXAMPLE_MANIFEST_URL,
          EXAMPLE_DOC_URL);
      const applications = parsedManifest.value.related_applications.value;
      assert.equal(applications.length, 2);
      const url0 = applications[0].value.url.value;
      assert.equal(url0, exampleManifest.related_applications[0].url);
      const url1 = applications[1].value.url.value;
      assert.equal(url1, exampleManifest.related_applications[1].url);
    });

    it('handles applications with invalid urls', () => {
      /* eslint-disable camelcase */
      const exampleManifest = {
        related_applications: [{
          platform: 'play',
          url: 6,
          id: 'com.example.app1'
        }, {
          platform: 'itunes',
          url: {}
        }]
      };
      /* eslint-enable camelcase */

      const parsedManifest = manifestParser(JSON.stringify(exampleManifest), EXAMPLE_MANIFEST_URL,
          EXAMPLE_DOC_URL);
      const applications = parsedManifest.value.related_applications.value;
      // First entry's url should be discarded but entry preserved due to valid id.
      // Second entry should be discarded since discarded url and no id.
      assert.equal(applications.length, 1);
      const url0 = applications[0].value.url.value;
      assert.equal(url0, undefined);
    });
  });
});
