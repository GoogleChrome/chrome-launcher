/**
 * @license
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
/*
 * @fileoverview This audit determines if the images used are sufficiently larger
 * than Lighthouse optimized versions of the images (as determined by the gatherer).
 * Audit will fail if one of the conditions are met:
 *   * There is at least one JPEG or bitmap image that was >10KB larger than canvas encoded JPEG.
 *   * There is at least one image that would have saved more than 100KB by using WebP.
 *   * The savings of moving all images to WebP is greater than 1MB.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit');
const URL = require('../../lib/url-shim');

const IGNORE_THRESHOLD_IN_BYTES = 2048;
const TOTAL_WASTED_BYTES_THRESHOLD = 1000 * 1024;
const JPEG_ALREADY_OPTIMIZED_THRESHOLD_IN_BYTES = 25 * 1024;
const WEBP_ALREADY_OPTIMIZED_THRESHOLD_IN_BYTES = 100 * 1024;

class UsesOptimizedImages extends ByteEfficiencyAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Images',
      name: 'uses-optimized-images',
      description: 'Unoptimized images',
      informative: true,
      helpText: 'Images should be optimized to save network bytes. ' +
        'The following images could have smaller file sizes when compressed with ' +
        '[WebP](https://developers.google.com/speed/webp/) or JPEG at 80 quality. ' +
        '[Learn more about image optimization](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/image-optimization).',
      requiredArtifacts: ['OptimizedImages', 'networkRecords']
    };
  }

  /**
   * @param {{originalSize: number, webpSize: number, jpegSize: number}} image
   * @param {string} type
   * @return {{bytes: number, percent: number}}
   */
  static computeSavings(image, type) {
    const bytes = image.originalSize - image[type + 'Size'];
    const percent = 100 * bytes / image.originalSize;
    return {bytes, percent};
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {{results: !Array<Object>, tableHeadings: Object,
   *     passes: boolean=, debugString: string=}}
   */
  static audit_(artifacts) {
    const images = artifacts.OptimizedImages;

    const failedImages = [];
    let totalWastedBytes = 0;
    let hasAllEfficientImages = true;

    const results = images.reduce((results, image) => {
      if (image.failed) {
        failedImages.push(image);
        return results;
      } else if (image.originalSize < Math.max(IGNORE_THRESHOLD_IN_BYTES, image.webpSize)) {
        return results;
      }

      const url = URL.getDisplayName(image.url);
      const webpSavings = UsesOptimizedImages.computeSavings(image, 'webp');

      if (webpSavings.bytes > WEBP_ALREADY_OPTIMIZED_THRESHOLD_IN_BYTES) {
        hasAllEfficientImages = false;
      } else if (webpSavings.bytes < IGNORE_THRESHOLD_IN_BYTES) {
        return results;
      }

      let jpegSavingsLabel;
      if (/(jpeg|bmp)/.test(image.mimeType)) {
        const jpegSavings = UsesOptimizedImages.computeSavings(image, 'jpeg');
        if (jpegSavings.bytes > JPEG_ALREADY_OPTIMIZED_THRESHOLD_IN_BYTES) {
          hasAllEfficientImages = false;
        }
        if (jpegSavings.bytes > IGNORE_THRESHOLD_IN_BYTES) {
          jpegSavingsLabel = this.toSavingsString(jpegSavings.bytes, jpegSavings.percent);
        }
      }

      totalWastedBytes += webpSavings.bytes;

      results.push({
        url,
        isCrossOrigin: !image.isSameOrigin,
        preview: {url: image.url, mimeType: image.mimeType},
        totalBytes: image.originalSize,
        wastedBytes: webpSavings.bytes,
        webpSavings: this.toSavingsString(webpSavings.bytes, webpSavings.percent),
        jpegSavings: jpegSavingsLabel
      });
      return results;
    }, []);

    let debugString;
    if (failedImages.length) {
      const urls = failedImages.map(image => URL.getDisplayName(image.url));
      debugString = `Lighthouse was unable to decode some of your images: ${urls.join(', ')}`;
    }

    return {
      passes: hasAllEfficientImages && totalWastedBytes < TOTAL_WASTED_BYTES_THRESHOLD,
      debugString,
      results,
      tableHeadings: {
        preview: '',
        url: 'URL',
        totalKb: 'Original',
        webpSavings: 'WebP Savings',
        jpegSavings: 'JPEG Savings',
      }
    };
  }
}

module.exports = UsesOptimizedImages;
