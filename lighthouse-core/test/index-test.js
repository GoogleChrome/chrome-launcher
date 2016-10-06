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

const pkg = require('../../package.json');
const assert = require('assert');
const lighthouse = require('..');

describe('Module Tests', function() {
  it('should have a main attribute defined in the package.json', function() {
    assert.ok(pkg.main);
  });

  it('should be able to require in the package.json\'s main file', function() {
    assert.ok(lighthouse);
  });

  it('should require lighthouse as a function', function() {
    assert.ok(typeof lighthouse === 'function');
  });

  it('should throw an error when the first parameter is not defined', function() {
    return lighthouse()
      .then(() => {
        throw new Error('Should not have resolved when first arg is not a string');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the first parameter is an empty string', function() {
    return lighthouse('')
      .then(() => {
        throw new Error('Should not have resolved when first arg is an empty string');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the first parameter is not a string', function() {
    return lighthouse({})
      .then(() => {
        throw new Error('Should not have resolved when first arg is not a string');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the second parameter is not an object', function() {
    return lighthouse('SOME_URL', 'flags')
      .then(() => {
        throw new Error('Should not have resolved when second arg is not an object');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the config is invalid', function() {
    return lighthouse('SOME_URL', {}, {})
      .then(() => {
        throw new Error('Should not have resolved when second arg is not an object');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the config contains incorrect audits', function() {
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

  it('should return formatted audit results when given no aggregations', function() {
    const exampleUrl = 'https://example.com/';
    return lighthouse(exampleUrl, {
      output: 'json'
    }, {
      auditResults: [{
        score: true,
        displayValue: '',
        rawValue: true,
        name: 'viewport',
        category: 'Mobile Friendly',
        description: 'HTML has a viewport <meta>'
      }]
    }).then(results => {
      assert.ok(results.lighthouseVersion);
      assert.ok(results.generatedTime);
      assert.equal(results.url, exampleUrl);
      assert.equal(results.initialUrl, exampleUrl);
      assert.ok(Array.isArray(results.aggregations));
      assert.equal(results.aggregations.length, 0);
      assert.ok(results.audits.viewport);
    });
  });

  it('should return a list of audits', function() {
    assert.ok(Array.isArray(lighthouse.getAuditList()));
  });

  it('should return a list of trace categories required by the driver', function() {
    const lighthouseTraceCategories = lighthouse.traceCategories;
    assert.ok(Array.isArray(lighthouseTraceCategories));
    assert.notEqual(lighthouseTraceCategories.length, 0);
  });
});
