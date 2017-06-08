/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const NetworkThroughput = require('../../../gather/computed/network-throughput');
const assert = require('assert');

describe('NetworkThroughput', () => {
  const compute = NetworkThroughput.getThroughput;
  function createRecord(responseReceivedTime, endTime, extras) {
    return Object.assign({
      responseReceivedTime,
      endTime,
      transferSize: 1000,
      finished: true,
      failed: false,
      statusCode: 200,
      url: 'https://google.com/logo.png',
      parsedURL: {isValid: true, scheme: 'https'}
    }, extras);
  }

  it('should return Infinity for no/missing records', () => {
    assert.equal(compute([]), Infinity);
    assert.equal(compute([createRecord(0, 0, {finished: false})]), Infinity);
  });

  it('should compute correctly for a basic waterfall', () => {
    const result = compute([
      createRecord(0, 1),
      createRecord(1, 2),
      createRecord(2, 6),
    ]);

    assert.equal(result, 500);
  });

  it('should compute correctly for concurrent requests', () => {
    const result = compute([
      createRecord(0, 1),
      createRecord(0.5, 1),
    ]);

    assert.equal(result, 2000);
  });

  it('should compute correctly for gaps', () => {
    const result = compute([
      createRecord(0, 1),
      createRecord(3, 4),
    ]);

    assert.equal(result, 1000);
  });

  it('should compute correctly for partially overlapping requests', () => {
    const result = compute([
      createRecord(0, 1),
      createRecord(0.5, 1.5),
      createRecord(1.25, 3),
      createRecord(1.4, 4),
      createRecord(5, 9)
    ]);

    assert.equal(result, 625);
  });

  it('should exclude failed records', () => {
    const extras = {failed: true};
    const result = compute([createRecord(0, 2), createRecord(3, 4, extras)]);
    assert.equal(result, 500);
  });

  it('should exclude cached records', () => {
    const extras = {statusCode: 304};
    const result = compute([createRecord(0, 2), createRecord(3, 4, extras)]);
    assert.equal(result, 500);
  });

  it('should exclude unfinished records', () => {
    const extras = {finished: false};
    const result = compute([createRecord(0, 2), createRecord(3, 4, extras)]);
    assert.equal(result, 500);
  });

  it('should exclude data URIs', () => {
    const extras = {parsedURL: {scheme: 'data'}};
    const result = compute([createRecord(0, 2), createRecord(3, 4, extras)]);
    assert.equal(result, 500);
  });
});
