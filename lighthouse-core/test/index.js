/**
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

/* eslint-env mocha */

const pkg = require('../package.json');
const assert = require('assert');

describe('Module Tests', function() {
  it('throws if node < 5 is used', () => {
    const oldVersion = process.version;

    // Override to an old version of Node.
    Object.defineProperty(process, 'version', {
      value: 'v0.1.0'
    });

    assert.throws(_ => {
      require('../..');
    });

    // Reset to the current version.
    Object.defineProperty(process, 'version', {
      value: oldVersion
    });
  });

  it('should have a main attribute defined in the package.json', function() {
    assert.ok(pkg.main);
  });

  it('should be able to require in the package.json\'s main file', function() {
    const lighthouse = require('..');
    assert.ok(lighthouse);
  });

  it('should require lighthouse as a function', function() {
    const lighthouse = require('..');
    assert.ok(typeof lighthouse === 'function');
  });

  it('should throw an error when the first parameter is not defined', function() {
    const lighthouse = require('..');
    return lighthouse()
      .then(() => {
        throw new Error('Should not have resolved when first arg is not a string');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the first parameter is an empty string', function() {
    const lighthouse = require('..');
    return lighthouse('')
      .then(() => {
        throw new Error('Should not have resolved when first arg is an empty string');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the first parameter is not a string', function() {
    const lighthouse = require('..');
    return lighthouse({})
      .then(() => {
        throw new Error('Should not have resolved when first arg is not a string');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the second parameter is not an object', function() {
    const lighthouse = require('..');
    return lighthouse('SOME_URL', 'flags')
      .then(() => {
        throw new Error('Should not have resolved when second arg is not an object');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the config is invalid', function() {
    const lighthouse = require('..');
    return lighthouse('SOME_URL', {}, {})
      .then(() => {
        throw new Error('Should not have resolved when second arg is not an object');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the config contains incorrect audits', function() {
    const lighthouse = require('..');
    return lighthouse('SOME_URL', {}, {
      passes: [{
        gatherers: [
          'url'
        ]
      }],
      audits: [
        'fluff'
      ],
      aggregations: []
    })
      .then(() => {
        throw new Error('Should not have resolved');
      }, err => {
        assert.ok(err.message.includes('fluff'));
      });
  });

  it('should return a list of audits', function() {
    const lighthouseModule = require('..');
    assert.ok(Array.isArray(lighthouseModule.getAuditList()));
  });

  it('should return a list of trace categories required by the driver', function() {
    const lighthouseModule = require('..');
    const lighthouseTraceCategories = lighthouseModule.traceCategories;
    assert.ok(Array.isArray(lighthouseTraceCategories));
    assert.notEqual(lighthouseTraceCategories.length, 0);
  });
});
