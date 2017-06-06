/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

 /**
  * @fileoverview Determines optimized gzip/br/deflate filesizes for all responses by
  *   checking the content-encoding header.
  */
'use strict';

const Gatherer = require('../gatherer');
const gzip = require('zlib').gzip;

const compressionTypes = ['gzip', 'br', 'deflate'];

class ResponseCompression extends Gatherer {
  /**
   * @param {!NetworkRecords} networkRecords
   * @return {!Array<{url: string, isBase64DataUri: boolean, mimeType: string, resourceSize: number}>}
   */
  static filterUnoptimizedResponses(networkRecords) {
    const unoptimizedResponses = [];

    networkRecords.forEach(record => {
      const isTextBasedResource = record.resourceType() && record.resourceType().isTextType();
      if (!isTextBasedResource || !record.resourceSize || !record.finished) {
        return;
      }

      const isContentEncoded = record.responseHeaders.find(header =>
        header.name.toLowerCase() === 'content-encoding' &&
        compressionTypes.includes(header.value)
      );

      if (!isContentEncoded) {
        unoptimizedResponses.push({
          requestId: record.requestId,
          url: record.url,
          mimeType: record.mimeType,
          resourceSize: record.resourceSize,
        });
      }
    });

    return unoptimizedResponses;
  }

  afterPass(options, traceData) {
    const networkRecords = traceData.networkRecords;
    const textRecords = ResponseCompression.filterUnoptimizedResponses(networkRecords);

    const driver = options.driver;
    return Promise.all(textRecords.map(record => {
      return driver.getRequestContent(record.requestId).then(content => {
        // if we don't have any content gzipSize is set to 0
        if (!content) {
          record.gzipSize = 0;

          return record;
        }

        return new Promise((resolve, reject) => {
          return gzip(content, (err, res) => {
            if (err) {
              return reject(err);
            }

            // get gzip size
            record.gzipSize = Buffer.byteLength(res, 'utf8');

            resolve(record);
          });
        });
      });
    }));
  }
}

module.exports = ResponseCompression;
