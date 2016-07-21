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

/* global describe, it */

var manifestParser = require('../lib/manifest-parser');
var assert = require('assert');
const manifestStub = require('./fixtures/manifest.json');

describe('Manifest Parser', function() {
  it('should not parse empty string input', function() {
    let parsedManifest = manifestParser('');
    assert.ok(parsedManifest.debugString);
  });

  it('accepts empty dictionary', function() {
    let parsedManifest = manifestParser('{}');
    assert(!parsedManifest.debugString);
    assert.equal(parsedManifest.value.name.value, undefined);
    assert.equal(parsedManifest.value.short_name.value, undefined);
    assert.equal(parsedManifest.value.start_url.value, undefined);
    assert.equal(parsedManifest.value.display.value, undefined);
    assert.equal(parsedManifest.value.orientation.value, undefined);
    assert.equal(parsedManifest.value.theme_color.value, undefined);
    assert.equal(parsedManifest.value.background_color.value, undefined);
    // TODO:
    // icons
    // related_applications
    // prefer_related_applications
  });

  it('accepts unknown values', function() {
    // TODO(bckenny): this is the same exact test as above
    let parsedManifest = manifestParser('{}');
    assert(!parsedManifest.debugString);
    assert.equal(parsedManifest.value.name.value, undefined);
    assert.equal(parsedManifest.value.short_name.value, undefined);
    assert.equal(parsedManifest.value.start_url.value, undefined);
    assert.equal(parsedManifest.value.display.value, undefined);
    assert.equal(parsedManifest.value.orientation.value, undefined);
    assert.equal(parsedManifest.value.theme_color.value, undefined);
    assert.equal(parsedManifest.value.background_color.value, undefined);
  });

  describe('icon parsing', function() {
    it('parses basic string', function() {
      let parsedManifest = manifestParser('{"icons": [{"src": "192.png", "sizes": "192x192"}]}');
      assert(!parsedManifest.debugString);
      let icons = parsedManifest.value.icons;
      assert(!icons.debugString);
      let icon192 = icons.value[0];
      assert(!icon192.value.sizes.debugString);
      assert.equal(icons.value.length, 1);
    });

    it('finds three icons in the stub manifest', function() {
      let parsedManifest = manifestParser(JSON.stringify(manifestStub));
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.icons.value.length, 3);
    });

    it('parses icons with extra whitespace', function() {
      let manifest = '{"icons": [{"src": "192.png", "sizes": " 192x192   256x256"}]}';
      let parsedManifest = manifestParser(manifest);
      let icons = parsedManifest.value.icons;
      let icon192 = icons.value[0];
      let icon192Sizes = icon192.value.sizes.value;
      assert.equal(icon192Sizes[0], '192x192');
      assert.equal(icon192Sizes[1], '256x256');
    });
  });

  describe('name parsing', function() {
    it('parses basic string', function() {
      let parsedManifest = manifestParser('{"name":"foo"}');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.name.value, 'foo');
    });

    it('trims whitespaces', function() {
      let parsedManifest = manifestParser('{"name":" foo "}');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.name.value, 'foo');
    });

    it('doesn\'t parse non-string', function() {
      let parsedManifest = manifestParser('{"name": {} }');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.name.value, undefined);

      parsedManifest = manifestParser('{"name": 42 }');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.name.value, undefined);
    });
  });

  describe('short_name parsing', function() {
    it('parses basic string', function() {
      let parsedManifest = manifestParser('{"short_name":"foo"}');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.short_name.value, 'foo');
    });

    it('trims whitespaces', function() {
      let parsedManifest = manifestParser('{"short_name":" foo "}');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.short_name.value, 'foo');
    });

    it('doesn\'t parse non-string', function() {
      let parsedManifest = manifestParser('{"short_name": {} }');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.short_name.value, undefined);

      parsedManifest = manifestParser('{"short_name": 42 }');
      assert(!parsedManifest.debugString);
      assert.equal(parsedManifest.value.short_name.value, undefined);
    });
  });
});
