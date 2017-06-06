/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/*
 * @fileoverview This audit determines if the images could be smaller when compressed with WebP.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit');
const OptimizedImages = require('./uses-optimized-images');
const URL = require('../../lib/url-shim');

const IGNORE_THRESHOLD_IN_BYTES = 8192;

class UsesWebPImages extends ByteEfficiencyAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Images',
      name: 'uses-webp-images',
      description: 'Serve images as WebP',
      informative: true,
      helpText: '[WebP](https://developers.google.com/speed/webp/) images take less time to download and save cellular data. ' +
        '[Learn more about image optimization](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/image-optimization).',
      requiredArtifacts: ['OptimizedImages', 'devtoolsLogs']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!Audit.HeadingsResult}
   */
  static audit_(artifacts) {
    const images = artifacts.OptimizedImages;

    const failedImages = [];
    const results = [];
    images.forEach(image => {
      if (image.failed) {
        failedImages.push(image);
        return;
      } else if (image.originalSize < image.webpSize + IGNORE_THRESHOLD_IN_BYTES) {
        return;
      }

      const url = URL.elideDataURI(image.url);
      const webpSavings = OptimizedImages.computeSavings(image, 'webp');

      results.push({
        url,
        isCrossOrigin: !image.isSameOrigin,
        preview: {url: image.url, mimeType: image.mimeType, type: 'thumbnail'},
        totalBytes: image.originalSize,
        wastedBytes: webpSavings.bytes,
      });
    });

    let debugString;
    if (failedImages.length) {
      const urls = failedImages.map(image => URL.getURLDisplayName(image.url));
      debugString = `Lighthouse was unable to decode some of your images: ${urls.join(', ')}`;
    }

    const headings = [
      {key: 'preview', itemType: 'thumbnail', text: ''},
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'totalKb', itemType: 'text', text: 'Original'},
      {key: 'potentialSavings', itemType: 'text', text: 'Potential Savings'},
    ];

    return {
      debugString,
      results,
      headings
    };
  }
}

module.exports = UsesWebPImages;
