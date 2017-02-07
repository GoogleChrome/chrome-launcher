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
  * @fileoverview Gathers all images used on the page with their src, size,
  *   and attribute information. Executes script in the context of the page.
  */
'use strict';

const Gatherer = require('./gatherer');

/* global document, Image */

/* istanbul ignore next */
function collectImageElementInfo() {
  return [...document.querySelectorAll('img')].map(element => {
    return {
      // currentSrc used over src to get the url as determined by the browser
      // after taking into account srcset/media/sizes/etc.
      src: element.currentSrc,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      naturalWidth: element.naturalWidth,
      naturalHeight: element.naturalHeight,
      isPicture: element.parentElement.tagName === 'PICTURE',
    };
  });
}

/* istanbul ignore next */
function determineNaturalSize(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('error', reject);
    img.addEventListener('load', () => {
      resolve({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    });

    img.src = url;
  });
}

class ImageUsage extends Gatherer {

  /**
   * @param {{src: string}} element
   * @return {!Promise<!Object>}
   */
  fetchElementWithSizeInformation(element) {
    const url = JSON.stringify(element.src);
    return this.driver.evaluateAsync(`(${determineNaturalSize.toString()})(${url})`)
      .then(size => {
        return Object.assign(element, size);
      });
  }

  afterPass(options, traceData) {
    const driver = this.driver = options.driver;
    const indexedNetworkRecords = traceData.networkRecords.reduce((map, record) => {
      if (/^image/.test(record._mimeType)) {
        map[record._url] = {
          url: record.url,
          resourceSize: record.resourceSize,
          startTime: record.startTime,
          endTime: record.endTime,
          responseReceivedTime: record.responseReceivedTime,
          mimeType: record._mimeType
        };
      }

      return map;
    }, {});

    return driver.evaluateAsync(`(${collectImageElementInfo.toString()})()`)
      .then(elements => {
        return elements.reduce((promise, element) => {
          return promise.then(collector => {
            // link up the image with its network record
            element.networkRecord = indexedNetworkRecords[element.src];

            // Images within `picture` behave strangely and natural size information
            // isn't accurate. Try to get the actual size if we can.
            const elementPromise = element.isPicture && element.networkRecord ?
                this.fetchElementWithSizeInformation(element) :
                Promise.resolve(element);

            return elementPromise.then(element => {
              collector.push(element);
              return collector;
            });
          });
        }, Promise.resolve([]));
      });
  }
}

module.exports = ImageUsage;
