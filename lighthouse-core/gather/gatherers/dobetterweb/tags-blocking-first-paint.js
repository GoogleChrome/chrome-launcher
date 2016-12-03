/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
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
'use strict';

const Gatherer = require('../gatherer');

/* global document,window */

/* istanbul ignore next */
function collectTagsThatBlockFirstPaint() {
  return new Promise((resolve, reject) => {
    try {
      const tagList = [...document.querySelectorAll('link, head script[src]')]
        .filter(tag => {
          if (tag.tagName === 'SCRIPT') {
            return !tag.hasAttribute('async') &&
                !tag.hasAttribute('defer') &&
                !/^data:/.test(tag.src);
          }

          // Filter stylesheet/HTML imports that block rendering.
          // https://www.igvita.com/2012/06/14/debunking-responsive-css-performance-myths/
          // https://www.w3.org/TR/html-imports/#dfn-import-async-attribute
          const blockingStylesheet = (tag.rel === 'stylesheet' &&
              window.matchMedia(tag.media).matches && !tag.disabled);
          const blockingImport = tag.rel === 'import' && !tag.hasAttribute('async');
          return blockingStylesheet || blockingImport;
        })
        .map(tag => {
          return {
            tagName: tag.tagName,
            url: tag.tagName === 'LINK' ? tag.href : tag.src,
            src: tag.src,
            href: tag.href,
            rel: tag.rel,
            media: tag.media,
            disabled: tag.disabled
          };
        });
      resolve(tagList);
    } catch (e) {
      const friendly = 'Unable to gather Scripts/Stylesheets/HTML Imports on the page';
      reject(new Error(`${friendly}: ${e.message}`));
    }
  });
}

function filteredAndIndexedByUrl(networkRecords) {
  return networkRecords.reduce((prev, record) => {
    // Filter stylesheet, javascript, and html import mimetypes.
    if (/(css|html|script)/.test(record._mimeType)) {
      prev[record._url] = {
        transferSize: record._transferSize,
        startTime: record._startTime,
        endTime: record._endTime
      };
    }
    return prev;
  }, {});
}

class TagsBlockingFirstPaint extends Gatherer {
  constructor() {
    super();
    this._filteredAndIndexedByUrl = filteredAndIndexedByUrl;
  }

  static findBlockingTags(driver, networkRecords) {
    const scriptSrc = `(${collectTagsThatBlockFirstPaint.toString()}())`;
    return driver.evaluateAsync(scriptSrc).then(tags => {
      const requests = filteredAndIndexedByUrl(networkRecords);

      let totalTransferSize = 0;
      let totalSpendTime = 0;

      const blockingTags = tags.reduce((prev, tag) => {
        const request = requests[tag.url];
        if (request) {
          const data = {
            tag,
            transferSize: request.transferSize,
            spendTime: Math.round((request.endTime - request.startTime) * 1000)
          };
          totalTransferSize += data.transferSize;
          totalSpendTime += data.spendTime;
          prev.push(data);
        }
        return prev;
      }, []);

      return {
        items: blockingTags,
        total: {
          transferSize: totalTransferSize,
          spendTime: totalSpendTime
        }
      };
    });
  }

  afterPass(options, tracingData) {
    return TagsBlockingFirstPaint
      .findBlockingTags(options.driver, tracingData.networkRecords)
      .then(artifact => {
        this.artifact = artifact;
      })
      .catch(err => {
        this.artifact = {
          value: -1,
          debugString: err.message
        };
      });
  }
}

module.exports = TagsBlockingFirstPaint;
