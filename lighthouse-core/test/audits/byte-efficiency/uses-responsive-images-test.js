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

const UsesResponsiveImagesAudit =
    require('../../../audits/byte-efficiency/uses-responsive-images.js');
const assert = require('assert');

/* eslint-env mocha */
function generateRecord(resourceSizeInKb, durationInMs) {
  return {
    resourceSize: resourceSizeInKb * 1024,
    endTime: durationInMs / 1000,
    responseReceivedTime: 0
  };
}

function generateSize(width, height, prefix = 'client') {
  const size = {};
  size[`${prefix}Width`] = width;
  size[`${prefix}Height`] = height;
  return size;
}

function generateImage(clientSize, naturalSize, networkRecord, src = 'https://google.com/logo.png') {
  const image = {src, networkRecord};
  Object.assign(image, clientSize, naturalSize);
  return image;
}

describe('Page uses responsive images', () => {
  function testImage(condition, data) {
    const description = `${data.passes ? 'passes' : 'fails'} when an image is ${condition}`;
    it(description, () => {
      const result = UsesResponsiveImagesAudit.audit_({
        ContentWidth: {devicePixelRatio: data.devicePixelRatio || 1},
        ImageUsage: [
          generateImage(
            generateSize(...data.clientSize),
            generateSize(...data.naturalSize, 'natural'),
            generateRecord(data.sizeInKb, data.durationInMs || 200)
          )
        ]
      });

      assert.equal(result.passes, data.passes);
      assert.equal(result.results.length, data.listed || !data.passes ? 1 : 0);
    });
  }

  testImage('larger than displayed size', {
    passes: false,
    listed: false,
    devicePixelRatio: 2,
    clientSize: [100, 100],
    naturalSize: [300, 300],
    sizeInKb: 200
  });

  testImage('smaller than displayed size', {
    passes: true,
    listed: false,
    devicePixelRatio: 2,
    clientSize: [200, 200],
    naturalSize: [300, 300],
    sizeInKb: 200
  });

  testImage('small in file size', {
    passes: true,
    listed: true,
    devicePixelRatio: 2,
    clientSize: [100, 100],
    naturalSize: [300, 300],
    sizeInKb: 10
  });

  testImage('very small in file size', {
    passes: true,
    listed: false,
    devicePixelRatio: 2,
    clientSize: [100, 100],
    naturalSize: [300, 300],
    sizeInKb: 1
  });

  it('handles images without network record', () => {
    const auditResult = UsesResponsiveImagesAudit.audit_({
      ContentWidth: {devicePixelRatio: 2},
      ImageUsage: [
        generateImage(
          generateSize(100, 100),
          generateSize(300, 300, 'natural'),
          null
        ),
      ],
    });

    assert.equal(auditResult.passes, true);
    assert.equal(auditResult.results.length, 0);
  });

  it('passes when all images are not wasteful', () => {
    const auditResult = UsesResponsiveImagesAudit.audit_({
      ContentWidth: {devicePixelRatio: 2},
      ImageUsage: [
        generateImage(
          generateSize(200, 200),
          generateSize(450, 450, 'natural'),
          generateRecord(100, 300)
        ),
        generateImage(
          generateSize(100, 100),
          generateSize(210, 210, 'natural'),
          generateRecord(90, 500)
        ),
        generateImage(
          generateSize(100, 100),
          generateSize(80, 80, 'natural'),
          generateRecord(20, 100),
          'data:image/jpeg;base64,foobar'
        ),
      ],
    });

    assert.equal(auditResult.passes, true);
    assert.equal(auditResult.results.length, 2);
  });
});
