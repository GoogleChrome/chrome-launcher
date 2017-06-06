/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

 /**
  * @fileoverview Gathers all images used on the page with their src, size,
  *   and attribute information. Executes script in the context of the page.
  */
'use strict';

const Gatherer = require('./gatherer');

/* global window, document, Image */

/* istanbul ignore next */
function collectImageElementInfo() {
  function getClientRect(element) {
    const clientRect = element.getBoundingClientRect();
    return {
      // manually copy the properties because ClientRect does not JSONify
      top: clientRect.top,
      bottom: clientRect.bottom,
      left: clientRect.left,
      right: clientRect.right,
    };
  }

  const htmlImages = [...document.querySelectorAll('img')].map(element => {
    return {
      // currentSrc used over src to get the url as determined by the browser
      // after taking into account srcset/media/sizes/etc.
      src: element.currentSrc,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      clientRect: getClientRect(element),
      naturalWidth: element.naturalWidth,
      naturalHeight: element.naturalHeight,
      isCss: false,
      isPicture: element.parentElement.tagName === 'PICTURE',
    };
  });

  // Chrome normalizes background image style from getComputedStyle to be an absolute URL in quotes.
  // Only match basic background-image: url("http://host/image.jpeg") declarations
  const CSS_URL_REGEX = /^url\("([^"]+)"\)$/;
  // Only find images that aren't specifically scaled
  const CSS_SIZE_REGEX = /(auto|contain|cover)/;
  const cssImages = [...document.querySelectorAll('html /deep/ *')].reduce((images, element) => {
    const style = window.getComputedStyle(element);
    if (!CSS_URL_REGEX.test(style.backgroundImage) ||
        !CSS_SIZE_REGEX.test(style.backgroundSize)) {
      return images;
    }

    const imageMatch = style.backgroundImage.match(CSS_URL_REGEX);
    const url = imageMatch[1];

    // Heuristic to filter out sprite sheets
    const differentImages = images.filter(image => image.src !== url);
    if (images.length - differentImages.length > 2) {
      return differentImages;
    }

    images.push({
      src: url,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      clientRect: getClientRect(element),
      // CSS Images do not expose natural size, we'll determine the size later
      naturalWidth: Number.MAX_VALUE,
      naturalHeight: Number.MAX_VALUE,
      isCss: true,
      isPicture: false,
    });

    return images;
  }, []);

  return htmlImages.concat(cssImages);
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
      if (/^image/.test(record._mimeType) && record.finished) {
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

            // Images within `picture` behave strangely and natural size information isn't accurate,
            // CSS images have no natural size information at all.
            // Try to get the actual size if we can.
            const elementPromise = (element.isPicture || element.isCss) && element.networkRecord ?
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
