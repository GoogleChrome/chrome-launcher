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
 *   * There is at least one JPEG or bitmap image that was larger than canvas encoded JPEG.
 *   * There is at least one image that would have saved more than 50KB by using WebP.
 *   * The savings of moving all images to WebP is greater than 100KB.
 */
'use strict';

const Audit = require('../audit');
const URL = require('../../lib/url-shim');
const Formatter = require('../../formatters/formatter');

const KB_IN_BYTES = 1024;
const IGNORE_THRESHOLD_IN_BYTES = 2 * KB_IN_BYTES;
const TOTAL_WASTED_BYTES_THRESHOLD = 100 * KB_IN_BYTES;
const WEBP_ALREADY_OPTIMIZED_THRESHOLD_IN_BYTES = 50 * KB_IN_BYTES;

class UsesOptimizedImages extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Images',
      name: 'uses-optimized-images',
      description: 'Has optimized images',
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
   * @return {{bytes: number, kb: number, percent: number}}
   */
  static computeSavings(image, type) {
    const bytes = image.originalSize - image[type + 'Size'];
    const kb = Math.round(bytes / KB_IN_BYTES);
    const percent = Math.round(100 * bytes / image.originalSize);
    return {bytes, kb, percent};
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const networkRecords = artifacts.networkRecords[Audit.DEFAULT_PASS];
    return artifacts.requestNetworkThroughput(networkRecords).then(networkThroughput => {
      return UsesOptimizedImages.audit_(artifacts, networkThroughput);
    });
  }

  /**
   * @param {!Artifacts} artifacts
   * @param {number} networkThroughput
   * @return {!AuditResult}
   */
  static audit_(artifacts, networkThroughput) {
    const images = artifacts.OptimizedImages;

    if (images.rawValue === -1) {
      return UsesOptimizedImages.generateAuditResult(images);
    }

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

      const originalKb = Math.round(image.originalSize / KB_IN_BYTES);
      const url = URL.getDisplayName(image.url);
      const webpSavings = UsesOptimizedImages.computeSavings(image, 'webp');

      if (webpSavings.bytes > WEBP_ALREADY_OPTIMIZED_THRESHOLD_IN_BYTES) {
        hasAllEfficientImages = false;
      }

      let jpegSavingsLabel;
      if (/(jpeg|bmp)/.test(image.mimeType)) {
        const jpegSavings = UsesOptimizedImages.computeSavings(image, 'jpeg');
        if (jpegSavings.bytes > 0) {
          hasAllEfficientImages = false;
          jpegSavingsLabel = `${jpegSavings.percent}%`;
        }
      }

      totalWastedBytes += webpSavings.bytes;
      results.push({
        url,
        total: `${originalKb} KB`,
        webpSavings: `${webpSavings.percent}%`,
        jpegSavings: jpegSavingsLabel
      });
      return results;
    }, []);

    let displayValue = '';
    if (totalWastedBytes > 1000) {
      const totalWastedKb = Math.round(totalWastedBytes / KB_IN_BYTES);
      // Only round to nearest 10ms since we're relatively hand-wavy
      const totalWastedMs = Math.round(totalWastedBytes / networkThroughput * 100) * 10;
      displayValue = `${totalWastedKb}KB (~${totalWastedMs}ms) potential savings`;
    }

    let debugString;
    if (failedImages.length) {
      const urls = failedImages.map(image => URL.getDisplayName(image.url));
      debugString = `Lighthouse was unable to decode some of your images: ${urls.join(', ')}`;
    }

    return UsesOptimizedImages.generateAuditResult({
      displayValue,
      debugString,
      rawValue: hasAllEfficientImages && totalWastedBytes < TOTAL_WASTED_BYTES_THRESHOLD,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.TABLE,
        value: {
          results,
          tableHeadings: {
            url: 'URL',
            total: 'Original (KB)',
            webpSavings: 'WebP Savings (%)',
            jpegSavings: 'JPEG Savings (%)',
          }
        }
      }
    });
  }
}

module.exports = UsesOptimizedImages;
