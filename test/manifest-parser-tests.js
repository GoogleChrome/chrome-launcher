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
var expect = require('chai').expect;

describe('Manifest Parser', function() {
  it('should not parse empty string input', function() {
    ManifestParser.parse('');
    expect(ManifestParser.success()).to.equal(false);
  });

  it('has empty values when parsing empty manifest', function() {
    ManifestParser.parse('');
    expect(ManifestParser.manifest().name).to.equal(undefined);
    expect(ManifestParser.manifest().short_name).to.equal(undefined);
    expect(ManifestParser.manifest().start_url).to.equal(undefined);
    expect(ManifestParser.manifest().display).to.equal(undefined);
    expect(ManifestParser.manifest().orientation).to.equal(undefined);
    expect(ManifestParser.manifest().theme_color).to.equal(undefined);
    expect(ManifestParser.manifest().background_color).to.equal(undefined);
  });

  it('accepts empty dictionary', function() {
    ManifestParser.parse('{}');
    expect(ManifestParser.success()).to.equal(true);
    expect(ManifestParser.manifest().name).to.equal(undefined);
    expect(ManifestParser.manifest().short_name).to.equal(undefined);
    expect(ManifestParser.manifest().start_url).to.equal(undefined);
    expect(ManifestParser.manifest().display).to.equal(undefined);
    expect(ManifestParser.manifest().orientation).to.equal(undefined);
    expect(ManifestParser.manifest().theme_color).to.equal(undefined);
    expect(ManifestParser.manifest().background_color).to.equal(undefined);
    // TODO:
    // icons
    // related_applications
    // prefer_related_applications
  });

  it('accepts unknown values', function() {
    // TODO(bckenny): this is the same exact test as above
    ManifestParser.parse('{}');
    expect(ManifestParser.success()).to.equal(true);
    expect(ManifestParser.manifest().name).to.equal(undefined);
    expect(ManifestParser.manifest().short_name).to.equal(undefined);
    expect(ManifestParser.manifest().start_url).to.equal(undefined);
    expect(ManifestParser.manifest().display).to.equal(undefined);
    expect(ManifestParser.manifest().orientation).to.equal(undefined);
    expect(ManifestParser.manifest().theme_color).to.equal(undefined);
    expect(ManifestParser.manifest().background_color).to.equal(undefined);
  });

  describe('name parsing', function() {
    it('it parses basic string', function() {
      ManifestParser.parse('{"name":"foo"}');
      expect(ManifestParser.success()).to.equal(true);
      expect(ManifestParser.manifest().name).to.equal('foo');
    });

    it('it trims whitespaces', function() {
      ManifestParser.parse('{"name":" foo "}');
      expect(ManifestParser.success()).to.equal(true);
      expect(ManifestParser.manifest().name).to.equal('foo');
    });

    it('doesn\'t parse non-string', function() {
      ManifestParser.parse('{"name": {} }');
      expect(ManifestParser.success()).to.equal(true);
      expect(ManifestParser.manifest().name).to.equal(undefined);

      ManifestParser.parse('{"name": 42 }');
      expect(ManifestParser.success()).to.equal(true);
      expect(ManifestParser.manifest().name).to.equal(undefined);
    });
  });

  describe('short_name parsing', function() {
    it('it parses basic string', function() {
      ManifestParser.parse('{"short_name":"foo"}');
      expect(ManifestParser.success()).to.equal(true);
      expect(ManifestParser.manifest().short_name).to.equal('foo');
    });

    it('it trims whitespaces', function() {
      ManifestParser.parse('{"short_name":" foo "}');
      expect(ManifestParser.success()).to.equal(true);
      expect(ManifestParser.manifest().short_name).to.equal('foo');
    });

    it('doesn\'t parse non-string', function() {
      ManifestParser.parse('{"short_name": {} }');
      expect(ManifestParser.success()).to.equal(true);
      expect(ManifestParser.manifest().short_name).to.equal(undefined);

      ManifestParser.parse('{"short_name": 42 }');
      expect(ManifestParser.success()).to.equal(true);
      expect(ManifestParser.manifest().short_name).to.equal(undefined);
    });
  });
});
