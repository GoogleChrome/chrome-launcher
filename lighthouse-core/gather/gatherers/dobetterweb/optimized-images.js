/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

 /**
  * @fileoverview Determines optimized jpeg/webp filesizes for all same-origin and dataURI images by
  *   running the images through canvas in the browser context.
  */
'use strict';

const Gatherer = require('../gatherer');
const URL = require('../../../lib/url-shim');

/* global document, Image, atob */

/**
 * Runs in the context of the browser
 * @param {string} url
 * @return {!Promise<{jpeg: Object, webp: Object}>}
 */
/* istanbul ignore next */
function getOptimizedNumBytes(url) {
  return new Promise(function(resolve, reject) {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    function getTypeStats(type, quality) {
      const dataURI = canvas.toDataURL(type, quality);
      const base64 = dataURI.slice(dataURI.indexOf(',') + 1);
      return {base64: base64.length, binary: atob(base64).length};
    }

    img.addEventListener('error', reject);
    img.addEventListener('load', () => {
      try {
        canvas.height = img.height;
        canvas.width = img.width;
        context.drawImage(img, 0, 0);

        const jpeg = getTypeStats('image/jpeg', 0.92);
        const webp = getTypeStats('image/webp', 0.85);

        resolve({jpeg, webp});
      } catch (err) {
        reject(err);
      }
    }, false);

    img.src = url;
  });
}

class OptimizedImages extends Gatherer {
  /**
   * @param {string} pageUrl
   * @param {!NetworkRecords} networkRecords
   * @return {!Array<{url: string, isBase64DataUri: boolean, mimeType: string, resourceSize: number}>}
   */
  static filterImageRequests(pageUrl, networkRecords) {
    const seenUrls = new Set();
    return networkRecords.reduce((prev, record) => {
      if (seenUrls.has(record._url) || !record.finished) {
        return prev;
      }

      seenUrls.add(record._url);
      const isOptimizableImage = /image\/(png|bmp|jpeg)/.test(record._mimeType);
      const isSameOrigin = URL.originsMatch(pageUrl, record._url);
      const isBase64DataUri = /^data:.{2,40}base64\s*,/.test(record._url);

      if (isOptimizableImage) {
        prev.push({
          isSameOrigin,
          isBase64DataUri,
          requestId: record._requestId,
          url: record._url,
          mimeType: record._mimeType,
          resourceSize: record._resourceSize,
        });
      }

      return prev;
    }, []);
  }

  /**
   * @param {!Object} driver
   * @param {{url: string, isBase64DataUri: boolean, resourceSize: number}} networkRecord
   * @return {!Promise<?{originalSize: number, jpegSize: number, webpSize: number}>}
   */
  calculateImageStats(driver, networkRecord) {
    if (!networkRecord.isSameOrigin && !networkRecord.isBase64DataUri) {
      // Processing of cross-origin images is buggy and very slow, disable for now
      // See https://github.com/GoogleChrome/lighthouse/issues/1853
      // See https://github.com/GoogleChrome/lighthouse/issues/2146
      return Promise.resolve(null);
    }

    return Promise.resolve(networkRecord.url).then(uri => {
      const script = `(${getOptimizedNumBytes.toString()})(${JSON.stringify(uri)})`;
      return driver.evaluateAsync(script).then(stats => {
        if (!stats) {
          return null;
        }

        const isBase64DataUri = networkRecord.isBase64DataUri;
        const base64Length = networkRecord.url.length - networkRecord.url.indexOf(',') - 1;
        return {
          originalSize: isBase64DataUri ? base64Length : networkRecord.resourceSize,
          jpegSize: isBase64DataUri ? stats.jpeg.base64 : stats.jpeg.binary,
          webpSize: isBase64DataUri ? stats.webp.base64 : stats.webp.binary,
        };
      });
    });
  }

  /**
   * @param {!Object} driver
   * @param {!Array<!Object>} imageRecords
   * @return {!Promise<!Array<!Object>>}
   */
  computeOptimizedImages(driver, imageRecords) {
    return imageRecords.reduce((promise, record) => {
      return promise.then(results => {
        return this.calculateImageStats(driver, record)
          .catch(err => ({failed: true, err}))
          .then(stats => {
            if (!stats) {
              return results;
            }

            return results.concat(Object.assign(stats, record));
          });
      });
    }, Promise.resolve([]));
  }

  /**
   * @param {!Object} options
   * @param {{networkRecords: !Array<!NetworRecord>}} traceData
   * @return {!Promise<!Array<!Object>}
   */
  afterPass(options, traceData) {
    const networkRecords = traceData.networkRecords;
    const imageRecords = OptimizedImages.filterImageRequests(options.url, networkRecords);

    return Promise.resolve()
      .then(_ => this.computeOptimizedImages(options.driver, imageRecords))
      .then(results => {
        const successfulResults = results.filter(result => !result.failed);
        if (results.length && !successfulResults.length) {
          throw new Error('All image optimizations failed');
        }

        return results;
      });
  }
}

module.exports = OptimizedImages;
