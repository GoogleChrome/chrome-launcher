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
 /**
  * @fileoverview Checks to see if the images used on the page are larger than
  *   their display sizes. The audit will list all images that are larger than
  *   their display size regardless of DPR (a 1000px wide image displayed as a
  *   500px high-res image on a Retina display will show up as 75% unused);
  *   however, the audit will only fail pages that use images that have waste
  *   when computed with DPR taken into account.
  */
'use strict';

const Audit = require('../audit');
const URL = require('../../lib/url-shim');
const Formatter = require('../../formatters/formatter');

const KB_IN_BYTES = 1024;
const WASTEFUL_THRESHOLD_AS_RATIO = 0.1;

class UsesResponsiveImages extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Images',
      name: 'uses-responsive-images',
      description: 'Has appropriately sized images',
      helpText:
        'Image sizes served should be based on the device display size to save network bytes. ' +
        'Learn more about [responsive images](https://developers.google.com/web/fundamentals/design-and-ui/media/images) ' +
        'and [client hints](https://developers.google.com/web/updates/2015/09/automating-resource-selection-with-client-hints).',
      requiredArtifacts: ['ImageUsage', 'ContentWidth', 'networkRecords']
    };
  }

  /**
   * @param {!Object} image
   * @param {number} DPR devicePixelRatio
   * @return {?Object}
   */
  static computeWaste(image, DPR) {
    const url = URL.getDisplayName(image.src);
    const actualPixels = image.naturalWidth * image.naturalHeight;
    const usedPixels = image.clientWidth * image.clientHeight;
    const usedPixelsFullDPR = usedPixels * Math.pow(DPR, 2);
    const wastedRatio = 1 - (usedPixels / actualPixels);
    const wastedRatioFullDPR = 1 - (usedPixelsFullDPR / actualPixels);

    if (!Number.isFinite(wastedRatio)) {
      return new Error(`Invalid image sizing information ${url}`);
    } else if (wastedRatio <= 0) {
      // Image did not have sufficient resolution to fill display at DPR=1
      return null;
    }

    const totalBytes = image.networkRecord.resourceSize;
    const wastedBytes = Math.round(totalBytes * wastedRatio);

    return {
      wastedBytes,
      isWasteful: wastedRatioFullDPR > WASTEFUL_THRESHOLD_AS_RATIO,
      result: {
        url,
        totalKb: Math.round(totalBytes / KB_IN_BYTES) + ' KB',
        potentialSavings: Math.round(100 * wastedRatio) + '%'
      },
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const networkRecords = artifacts.networkRecords[Audit.DEFAULT_PASS];
    return artifacts.requestNetworkThroughput(networkRecords).then(networkThroughput => {
      return UsesResponsiveImages.audit_(artifacts, networkThroughput);
    });
  }

  /**
   * @param {!Artifacts} artifacts
   * @param {number} networkThroughput
   * @return {!AuditResult}
   */
  static audit_(artifacts, networkThroughput) {
    const images = artifacts.ImageUsage;
    const contentWidth = artifacts.ContentWidth;

    let debugString;
    let totalWastedBytes = 0;
    let hasWastefulImage = false;
    const DPR = contentWidth.devicePixelRatio;
    const results = images.reduce((results, image) => {
      if (!image.networkRecord) {
        return results;
      }

      const processed = UsesResponsiveImages.computeWaste(image, DPR);
      if (!processed) {
        return results;
      } else if (processed instanceof Error) {
        debugString = processed.message;
        return results;
      }

      hasWastefulImage = hasWastefulImage || processed.isWasteful;
      totalWastedBytes += processed.wastedBytes;
      results.push(processed.result);
      return results;
    }, []);

    let displayValue;
    if (results.length) {
      const totalWastedKB = Math.round(totalWastedBytes / KB_IN_BYTES);
      // Only round to nearest 10ms since we're relatively hand-wavy
      const totalWastedMs = Math.round(totalWastedBytes / networkThroughput * 100) * 10;
      displayValue = `${totalWastedKB}KB (~${totalWastedMs}ms) potential savings`;
    }

    return UsesResponsiveImages.generateAuditResult({
      debugString,
      displayValue,
      rawValue: !hasWastefulImage,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.TABLE,
        value: {
          results,
          tableHeadings: {
            url: 'URL',
            totalKb: 'Original (KB)',
            potentialSavings: 'Potential Savings (%)'
          }
        }
      }
    });
  }
}

module.exports = UsesResponsiveImages;
