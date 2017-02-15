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
  *   their display size with DPR (a 1000px wide image displayed as a
  *   500px high-res image on a Retina display is 100% used);
  *   However, the audit will only fail pages that use images that have waste
  *   beyond a particular byte threshold.
  */
'use strict';

const Audit = require('./byte-efficiency-audit');
const URL = require('../../lib/url-shim');

const IGNORE_THRESHOLD_IN_BYTES = 2048;
const WASTEFUL_THRESHOLD_IN_BYTES = 25 * 1024;

class UsesResponsiveImages extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Images',
      name: 'uses-responsive-images',
      description: 'Avoids oversized images',
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
    const usedPixels = image.clientWidth * image.clientHeight * Math.pow(DPR, 2);
    const wastedRatio = 1 - (usedPixels / actualPixels);
    const totalBytes = image.networkRecord.resourceSize;
    const wastedBytes = Math.round(totalBytes * wastedRatio);

    if (!Number.isFinite(wastedRatio)) {
      return new Error(`Invalid image sizing information ${url}`);
    } else if (wastedRatio <= 0 || wastedBytes < IGNORE_THRESHOLD_IN_BYTES) {
      // Image did not have sufficient resolution to fill display size
      return null;
    }

    return {
      url,
      preview: {
        url: image.networkRecord.url,
        mimeType: image.networkRecord.mimeType
      },
      totalBytes,
      wastedBytes,
      wastedPercent: 100 * wastedRatio,
      isWasteful: wastedBytes > WASTEFUL_THRESHOLD_IN_BYTES,
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {{results: !Array<Object>, tableHeadings: Object,
   *     passes: boolean=, debugString: string=}}
   */
  static audit_(artifacts) {
    const images = artifacts.ImageUsage;
    const contentWidth = artifacts.ContentWidth;

    let debugString;
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
      results.push(processed);
      return results;
    }, []);

    return {
      debugString,
      passes: !hasWastefulImage,
      results,
      tableHeadings: {
        preview: '',
        url: 'URL',
        totalKb: 'Original',
        potentialSavings: 'Potential Savings',
      }
    };
  }
}

module.exports = UsesResponsiveImages;
