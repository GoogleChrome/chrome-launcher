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
      description: 'Site uses appropriate image sizes',
      helpText:
        'Image sizes served should be based on the device display size to save network bytes. ' +
        'Learn more about [responsive images](https://developers.google.com/web/fundamentals/design-and-ui/media/images) ' +
        'and [client hints](https://developers.google.com/web/updates/2015/09/automating-resource-selection-with-client-hints).',
      requiredArtifacts: ['ImageUsage', 'ContentWidth']
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

    // TODO(#1517): use an average transfer time for data URI images
    const size = image.networkRecord.resourceSize;
    const transferTimeInMs = 1000 * (image.networkRecord.endTime -
        image.networkRecord.responseReceivedTime);
    const wastedBytes = Math.round(size * wastedRatio);
    const wastedTime = Math.round(transferTimeInMs * wastedRatio);
    const percentSavings = Math.round(100 * wastedRatio);
    const label = `${Math.round(size / KB_IN_BYTES)}KB total, ${percentSavings}% potential savings`;

    return {
      wastedBytes,
      wastedTime,
      isWasteful: wastedRatioFullDPR > WASTEFUL_THRESHOLD_AS_RATIO,
      result: {url, label},
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const images = artifacts.ImageUsage;
    const contentWidth = artifacts.ContentWidth;

    let debugString;
    let totalWastedBytes = 0;
    let totalWastedTime = 0;
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
      totalWastedTime += processed.wastedTime;
      totalWastedBytes += processed.wastedBytes;
      results.push(processed.result);
      return results;
    }, []);

    let displayValue;
    if (results.length) {
      const totalWastedKB = Math.round(totalWastedBytes / KB_IN_BYTES);
      displayValue = `${totalWastedKB}KB (~${totalWastedTime}ms) potential savings`;
    }

    return UsesResponsiveImages.generateAuditResult({
      debugString,
      displayValue,
      rawValue: !hasWastefulImage,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: results
      }
    });
  }
}

module.exports = UsesResponsiveImages;
