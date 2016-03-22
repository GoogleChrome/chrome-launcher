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

var manifestParser = require('../helpers/manifest-parser');
var expect = require('chai').expect;

describe('Manifest Parser', function() {
  it('should not parse empty string input', function() {
    let parsedManifest = manifestParser('');
    expect(!parsedManifest.warning).to.equal(false);
  });

  it('accepts empty dictionary', function() {
    let parsedManifest = manifestParser('{}');
    expect(!parsedManifest.warning).to.equal(true);
    expect(parsedManifest.value.name.value).to.equal(undefined);
    expect(parsedManifest.value.short_name.value).to.equal(undefined);
    expect(parsedManifest.value.start_url.value).to.equal(undefined);
    expect(parsedManifest.value.display.value).to.equal(undefined);
    expect(parsedManifest.value.orientation.value).to.equal(undefined);
    expect(parsedManifest.value.theme_color.value).to.equal(undefined);
    expect(parsedManifest.value.background_color.value).to.equal(undefined);
    // TODO:
    // icons
    // related_applications
    // prefer_related_applications
  });

  it('accepts unknown values', function() {
    // TODO(bckenny): this is the same exact test as above
    let parsedManifest = manifestParser('{}');
    expect(!parsedManifest.warning).to.equal(true);
    expect(parsedManifest.value.name.value).to.equal(undefined);
    expect(parsedManifest.value.short_name.value).to.equal(undefined);
    expect(parsedManifest.value.start_url.value).to.equal(undefined);
    expect(parsedManifest.value.display.value).to.equal(undefined);
    expect(parsedManifest.value.orientation.value).to.equal(undefined);
    expect(parsedManifest.value.theme_color.value).to.equal(undefined);
    expect(parsedManifest.value.background_color.value).to.equal(undefined);
  });

  describe('name parsing', function() {
    it('it parses basic string', function() {
      let parsedManifest = manifestParser('{"name":"foo"}');
      expect(!parsedManifest.warning).to.equal(true);
      expect(parsedManifest.value.name.value).to.equal('foo');
    });

    it('it trims whitespaces', function() {
      let parsedManifest = manifestParser('{"name":" foo "}');
      expect(!parsedManifest.warning).to.equal(true);
      expect(parsedManifest.value.name.value).to.equal('foo');
    });

    it('doesn\'t parse non-string', function() {
      let parsedManifest = manifestParser('{"name": {} }');
      expect(!parsedManifest.warning).to.equal(true);
      expect(parsedManifest.value.name.value).to.equal(undefined);

      parsedManifest = manifestParser('{"name": 42 }');
      expect(!parsedManifest.warning).to.equal(true);
      expect(parsedManifest.value.name.value).to.equal(undefined);
    });
  });

  describe('short_name parsing', function() {
    it('it parses basic string', function() {
      let parsedManifest = manifestParser('{"short_name":"foo"}');
      expect(!parsedManifest.warning).to.equal(true);
      expect(parsedManifest.value.short_name.value).to.equal('foo');
    });

    it('it trims whitespaces', function() {
      let parsedManifest = manifestParser('{"short_name":" foo "}');
      expect(!parsedManifest.warning).to.equal(true);
      expect(parsedManifest.value.short_name.value).to.equal('foo');
    });

    it('doesn\'t parse non-string', function() {
      let parsedManifest = manifestParser('{"short_name": {} }');
      expect(!parsedManifest.warning).to.equal(true);
      expect(parsedManifest.value.short_name.value).to.equal(undefined);

      parsedManifest = manifestParser('{"short_name": 42 }');
      expect(!parsedManifest.warning).to.equal(true);
      expect(parsedManifest.value.short_name.value).to.equal(undefined);
    });
  });
});
