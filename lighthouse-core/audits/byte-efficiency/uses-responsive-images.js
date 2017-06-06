/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
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

const ByteEfficiencyAudit = require('./byte-efficiency-audit');
const URL = require('../../lib/url-shim');

const IGNORE_THRESHOLD_IN_BYTES = 2048;
const WASTEFUL_THRESHOLD_IN_BYTES = 25 * 1024;

class UsesResponsiveImages extends ByteEfficiencyAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Images',
      name: 'uses-responsive-images',
      description: 'Properly size images',
      informative: true,
      helpText:
        'Serve images that are appropriately-sized to save cellular data ' +
        'and improve load time. ' +
        '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/oversized-images).',
      requiredArtifacts: ['ImageUsage', 'ViewportDimensions', 'devtoolsLogs']
    };
  }

  /**
   * @param {!Object} image
   * @param {number} DPR devicePixelRatio
   * @return {?Object}
   */
  static computeWaste(image, DPR) {
    const url = URL.elideDataURI(image.src);
    const actualPixels = image.naturalWidth * image.naturalHeight;
    const usedPixels = image.clientWidth * image.clientHeight * Math.pow(DPR, 2);
    const wastedRatio = 1 - (usedPixels / actualPixels);
    const totalBytes = image.networkRecord.resourceSize;
    const wastedBytes = Math.round(totalBytes * wastedRatio);

    if (!Number.isFinite(wastedRatio)) {
      return new Error(`Invalid image sizing information ${url}`);
    }

    return {
      url,
      preview: {
        type: 'thumbnail',
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
   * @return {!Audit.HeadingsResult}
   */
  static audit_(artifacts) {
    const images = artifacts.ImageUsage;
    const DPR = artifacts.ViewportDimensions.devicePixelRatio;

    let debugString;
    const resultsMap = new Map();
    images.forEach(image => {
      // TODO: give SVG a free pass until a detail per pixel metric is available
      if (!image.networkRecord || image.networkRecord.mimeType === 'image/svg+xml') {
        return;
      }

      const processed = UsesResponsiveImages.computeWaste(image, DPR);
      if (processed instanceof Error) {
        debugString = processed.message;
        return;
      }

      // Don't warn about an image that was later used appropriately
      const existing = resultsMap.get(processed.preview.url);
      if (!existing || existing.wastedBytes > processed.wastedBytes) {
        resultsMap.set(processed.preview.url, processed);
      }
    });

    const results = Array.from(resultsMap.values())
        .filter(item => item.wastedBytes > IGNORE_THRESHOLD_IN_BYTES);

    const headings = [
      {key: 'preview', itemType: 'thumbnail', text: ''},
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'totalKb', itemType: 'text', text: 'Original'},
      {key: 'potentialSavings', itemType: 'text', text: 'Potential Savings'},
    ];

    return {
      debugString,
      results,
      headings,
    };
  }
}

module.exports = UsesResponsiveImages;
