/**
 * Copyright 2017 Google Inc. All rights reserved.
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

const TotalByteWeight = require('../../../audits/byte-efficiency/total-byte-weight.js');
const assert = require('assert');

/* eslint-env mocha */

function generateRequest(url, size, baseUrl = 'http://google.com/') {
  return {
    url: `${baseUrl}${url}`,
    finished: true,
    transferSize: size * 1024,
    responseReceivedTime: 1000,
    endTime: 2000,
  };
}

function generateArtifacts(records) {
  if (records[0] && records[0].length > 1) {
    records = records.map(args => generateRequest(...args));
  }
  return {
    devtoolsLogs: {defaultPass: []},
    requestNetworkRecords: () => Promise.resolve(records),
    requestNetworkThroughput: () => Promise.resolve(1024)
  };
}

describe('Total byte weight audit', () => {
  it('passes when requests are small', () => {
    const artifacts = generateArtifacts([
      ['file.html', 30],
      ['file.js', 50],
      ['file.jpg', 70],
    ]);

    return TotalByteWeight.audit(artifacts).then(result => {
      assert.strictEqual(result.rawValue, 150 * 1024);
      assert.strictEqual(result.score, 100);
      const results = result.extendedInfo.value.results;
      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].totalBytes, 70 * 1024, 'results are sorted');
    });
  });

  it('scores in the middle when a mixture of small and large requests are used', () => {
    const artifacts = generateArtifacts([
      ['file.html', 30],
      ['file.js', 50],
      ['file.jpg', 70],
      ['file-large.jpg', 1000],
      ['file-xlarge.jpg', 3000],
      ['small1.js', 5],
      ['small2.js', 5],
      ['small3.js', 5],
      ['small4.js', 5],
      ['small5.js', 5],
      ['small6.js', 5],
    ]);

    return TotalByteWeight.audit(artifacts).then(result => {
      assert.ok(40 < result.score && result.score < 60, 'score is around 50');
      assert.strictEqual(result.rawValue, 4180 * 1024);
      const results = result.extendedInfo.value.results;
      assert.strictEqual(results.length, 10, 'results are clipped at top 10');
    });
  });

  it('fails when requests are huge', () => {
    const artifacts = generateArtifacts([
      ['file.html', 3000],
      ['file.js', 5000],
      ['file.jpg', 7000],
    ]);

    return TotalByteWeight.audit(artifacts).then(result => {
      assert.strictEqual(result.rawValue, 15000 * 1024);
      assert.strictEqual(result.score, 0);
    });
  });
});
