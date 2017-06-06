/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const UsesOptimizedImagesAudit =
    require('../../../audits/byte-efficiency/uses-optimized-images.js');
const assert = require('assert');

function generateImage(type, originalSize, webpSize, jpegSize) {
  const isData = /^data:/.test(type);
  if (isData) {
    type = type.slice('data:'.length);
  }

  return {
    isBase64DataUri: isData,
    url: isData ?
      `data:image/${type};base64,reaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaly ` +
      'reaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaly long' :
      `http://google.com/image.${type}`,
    mimeType: `image/${type}`,
    originalSize, webpSize, jpegSize
  };
}

/* eslint-env mocha */

describe('Page uses optimized images', () => {
  it('ignores files when there is only insignificant savings', () => {
    const auditResult = UsesOptimizedImagesAudit.audit_({
      OptimizedImages: [
        generateImage('jpeg', 5000, 4000, 4500),
      ],
    });

    assert.equal(auditResult.results.length, 0);
  });

  it('flags files when there is only small savings', () => {
    const auditResult = UsesOptimizedImagesAudit.audit_({
      OptimizedImages: [
        generateImage('jpeg', 15000, 4000, 4500),
      ],
    });

    assert.equal(auditResult.results.length, 1);
  });

  it('ignores files when no jpeg savings is available', () => {
    const auditResult = UsesOptimizedImagesAudit.audit_({
      OptimizedImages: [
        generateImage('png', 150000, 40000),
      ],
    });

    assert.equal(auditResult.results.length, 0);
  });

  it('passes when all images are sufficiently optimized', () => {
    const auditResult = UsesOptimizedImagesAudit.audit_({
      OptimizedImages: [
        generateImage('png', 50000, 30000),
        generateImage('jpeg', 50000, 30000, 50001),
        generateImage('png', 50000, 30000),
        generateImage('jpeg', 50000, 30000, 50001),
        generateImage('png', 49999, 30000),
      ],
    });

    assert.equal(auditResult.results.length, 0);
  });

  it('limits output of data URIs', () => {
    const image = generateImage('data:jpeg', 50000, 30000, 30000);
    const auditResult = UsesOptimizedImagesAudit.audit_({
      OptimizedImages: [image],
    });

    const actualUrl = auditResult.results[0].url;
    assert.ok(actualUrl.length < image.url.length, `${actualUrl} >= ${image.url}`);
  });

  it('warns when images have failed', () => {
    const auditResult = UsesOptimizedImagesAudit.audit_({
      OptimizedImages: [{failed: true, url: 'http://localhost/image.jpg'}],
    });

    assert.ok(/image.jpg/.test(auditResult.debugString));
  });
});
