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

var ManifestParser = require('../helpers/manifest-parser');
var assert = require('assert');

describe('Manifest Parser', function() {
  it('should not parse empty string input', function() {
    ManifestParser.parse('');
    assert.equal(false, ManifestParser.success());
  });

  it('has empty values when parsing empty manifest', function() {
    ManifestParser.parse('');
    assert.equal(null, ManifestParser.manifest().name);
    assert.equal(null, ManifestParser.manifest().short_name);
    assert.equal(null, ManifestParser.manifest().start_url);
    assert.equal(null, ManifestParser.manifest().display);
    assert.equal(null, ManifestParser.manifest().orientation);
    assert.equal(null, ManifestParser.manifest().theme_color);
    assert.equal(null, ManifestParser.manifest().background_color);
  });

  it('accepts empty dictionary', function() {
    ManifestParser.parse('{}');
    assert.equal(true, ManifestParser.success());
    assert.equal(null, ManifestParser.manifest().name);
    assert.equal(null, ManifestParser.manifest().short_name);
    assert.equal(null, ManifestParser.manifest().start_url);
    assert.equal(null, ManifestParser.manifest().display);
    assert.equal(null, ManifestParser.manifest().orientation);
    assert.equal(null, ManifestParser.manifest().theme_color);
    assert.equal(null, ManifestParser.manifest().background_color);
    // TODO:
    // icons
    // related_applications
    // prefer_related_applications
  });

  it('accepts unknown values', function() {
    ManifestParser.parse('{}');
    assert.equal(true, ManifestParser.success());
    assert.equal(null, ManifestParser.manifest().name);
    assert.equal(null, ManifestParser.manifest().short_name);
    assert.equal(null, ManifestParser.manifest().start_url);
    assert.equal(null, ManifestParser.manifest().display);
    assert.equal(null, ManifestParser.manifest().orientation);
    assert.equal(null, ManifestParser.manifest().theme_color);
    assert.equal(null, ManifestParser.manifest().background_color);
  });

  describe('name parsing', function() {
    it('it parses basic string', function() {
      ManifestParser.parse('{"name":"foo"}');
      assert.equal(true, ManifestParser.success());
      assert.equal('foo', ManifestParser.manifest().name);
    });

    it('it trims whitespaces', function() {
      ManifestParser.parse('{"name":" foo "}');
      assert.equal(true, ManifestParser.success());
      assert.equal('foo', ManifestParser.manifest().name);
    });

    it('doesn\'t parse non-string', function() {
      ManifestParser.parse('{"name": {} }');
      assert.equal(true, ManifestParser.success());
      assert.equal(null, ManifestParser.manifest().name);

      ManifestParser.parse('{"name": 42 }');
      assert.equal(true, ManifestParser.success());
      assert.equal(null, ManifestParser.manifest().name);
    });
  });

  describe('short_name parsing', function() {
    it('it parses basic string', function() {
      ManifestParser.parse('{"short_name":"foo"}');
      assert.equal(true, ManifestParser.success());
      assert.equal('foo', ManifestParser.manifest().short_name);
    });

    it('it trims whitespaces', function() {
      ManifestParser.parse('{"short_name":" foo "}');
      assert.equal(true, ManifestParser.success());
      assert.equal('foo', ManifestParser.manifest().short_name);
    });

    it('doesn\'t parse non-string', function() {
      ManifestParser.parse('{"short_name": {} }');
      assert.equal(true, ManifestParser.success());
      assert.equal(null, ManifestParser.manifest().short_name);

      ManifestParser.parse('{"short_name": 42 }');
      assert.equal(true, ManifestParser.success());
      assert.equal(null, ManifestParser.manifest().short_name);
    });
  });
});
