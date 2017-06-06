/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */
const assert = require('assert');
const fs = require('fs');

const PerfXDatabase = require('../../../performance-experiment/experiment-database/database');
const sampleResults = require('../../../../lighthouse-core/test/results/sample');

describe('Perf-X Database', function() {
  let perfXDatabase;
  beforeEach(() => perfXDatabase = new PerfXDatabase());
  afterEach(() => perfXDatabase.clear());

  it('can store and output experiments data', () => {
    const dataSets = [
      {
        flags: {
          'blockedUrlPatterns': ['.woff2', '.jpg'],
          'disableNetworkThrottling': false
        },
        results: sampleResults
      },
      {
        flags: {
          'blockedUrlPatterns': ['.woff'],
          'disableCpuThrottling': true,
          'deepReference': {'anObject': {'anArray': ['anElement', 'anotherElement']}}
        },
        results: {
          generatedTime: new Date(2015, 6, 27, 0, 12, 55, 60).toJSON(),
          url: 'http://google.com/',
          else: 'someData'
        }
      },
      {
        flags: {
          'blockedUrlPatterns': ['.woff', 'cat.jpg', '*'],
          'disableCpuThrottling': false,
          'disableDeviceEmulation': true
        },
        results: {
          'generatedTime': new Date(2014, 5, 1, 23, 56, 54, 99).toJSON(),
          'url': 'http://mdn.com/',
          'audits': [{'is-on-https': {'score': true}}],
        }
      }
    ];

    dataSets.forEach(dataSet => {
      dataSet.key = perfXDatabase.saveData(dataSet.flags, dataSet.results);
    });

    dataSets.forEach(dataSet => {
      assert.deepStrictEqual(perfXDatabase.getFlags(dataSet.key), dataSet.flags);
      assert.deepStrictEqual(perfXDatabase.getResults(dataSet.key), dataSet.results);
    });
  });

  it('prevents data from being changed by reference', () => {
    const flags = {
      'blockedUrlPatterns': ['.woff', '.jpg', 'random'],
      'disableCpuThrottling': false,
      'randomFlag': 'randomString'
    };
    const results = JSON.parse(JSON.stringify(sampleResults));

    const key = perfXDatabase.saveData(flags, results);
    const flagsBeforeChange = JSON.parse(JSON.stringify(perfXDatabase.getFlags(key)));
    const resultsBeforeChange = JSON.parse(JSON.stringify(perfXDatabase.getResults(key)));

    // data won't be changed when the flags/results passed to perfXDatabase.saveData is changed
    flags.blockedUrlPatterns.push('something');
    results.url = undefined;

    // data won't be changed when the flags/results returned by perfXDatabase is changed
    perfXDatabase.getFlags(key).anotherAttribute = 'random value';
    perfXDatabase.getResults(key).aggregations.push('new element');

    assert.deepStrictEqual(perfXDatabase.getFlags(key), flagsBeforeChange);
    assert.deepStrictEqual(perfXDatabase.getResults(key), resultsBeforeChange);
  });

  it('returns correct timestamps', () => {
    const dataSets = [
      {
        results: sampleResults
      },
      {
        results: {
          generatedTime: new Date(2015, 6, 12, 0, 6, 30, 60).toJSON(),
          url: 'http://google.com/',
        }
      },
      {
        results: {
          'generatedTime': new Date(2014, 2, 21, 11, 12, 33, 46).toJSON(),
          'url': 'http://mdn.com/',
        }
      }
    ];

    dataSets.forEach(dataSet => {
      dataSet.key = perfXDatabase.saveData({}, dataSet.results);
    });

    dataSets.forEach(dataSet => {
      assert.strictEqual(perfXDatabase.timeStamps[dataSet.key], dataSet.results.generatedTime);
    });

    assert.strictEqual(Object.keys(perfXDatabase.timeStamps).length, dataSets.length);
  });

  it('can delete temp folder on request', () => {
    const dataSets = [
      {
        flags: {
          'blockedUrlPatterns': ['.css', '.jpg'],
          'disableDeviceEmulation': false
        },
        results: sampleResults
      },
      {
        flags: {
          'blockedUrlPatterns': ['.js', '*'],
          'disableCpuThrottling': true,
          'disableNetworkThrottling': true
        },
        results: {
          'generatedTime': new Date(2015, 7, 23, 23, 56, 54, 99).toJSON(),
          'url': 'http://w3school.com/',
          'audits': [{'is-on-https': {'score': true}}],
        }
      }
    ];

    dataSets.forEach(dataSet => {
      dataSet.key = perfXDatabase.saveData({}, dataSet.results);
    });
    assert.ok(fs.existsSync(perfXDatabase.fsRoot));

    perfXDatabase.clear();
    assert.ok(!fs.existsSync(perfXDatabase.fsRoot));
  });
});
