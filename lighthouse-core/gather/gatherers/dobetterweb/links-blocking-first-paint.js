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
function collectLinksThatBlockFirstPaint() {
  return new Promise((resolve, reject) => {
    try {
      const linkList = [...document.querySelectorAll('link')]
        .filter(link => {
          // Filter stylesheet/HTML imports that block rendering.
          // https://www.igvita.com/2012/06/14/debunking-responsive-css-performance-myths/
          // https://www.w3.org/TR/html-imports/#dfn-import-async-attribute
          const blockingStylesheet = (link.rel === 'stylesheet' &&
              window.matchMedia(link.media).matches && !link.disabled);
          const blockingImport = link.rel === 'import' && !link.hasAttribute('async');
          return blockingStylesheet || blockingImport;
        })
        .map(link => {
          return {
            href: link.href,
            rel: link.rel,
            media: link.media,
            disabled: link.disabled
          };
        });
      resolve(linkList);
    } catch (e) {
      reject('Unable to get Stylesheets/HTML Imports on page');
    }
  });
}

class LinksBlockingFirstPaint extends Gatherer {

  _filteredLink(tracingData) {
    return tracingData.networkRecords.reduce((prev, record) => {
      // Filter stylesheet and html import mimetypes.
      if (/(css|html)/.test(record._mimeType)) {
        prev[record._url] = {
          transferSize: record._transferSize,
          startTime: record._startTime,
          endTime: record._endTime
        };
      }
      return prev;
    }, {});
  }

  _formatMS(info) {
    return Math.round((info.endTime - info.startTime) * 1000);
  }

  afterPass(options, tracingData) {
    const scriptSrc = `(${collectLinksThatBlockFirstPaint.toString()}())`;
    return options.driver.evaluateAsync(scriptSrc).then(links => {
      const linkInfo = this._filteredLink(tracingData);

      let totalTransferSize = 0;
      let totalSpendTime = 0;

      const blockingLinks = links.reduce((prev, link) => {
        if (linkInfo[link.href]) {
          const data = {
            link,
            transferSize: linkInfo[link.href].transferSize,
            spendTime: this._formatMS(linkInfo[link.href])
          };
          totalTransferSize += data.transferSize;
          totalSpendTime += data.spendTime;
          prev.push(data);
        }
        return prev;
      }, []);

      this.artifact = {
        items: blockingLinks,
        total: {
          transferSize: totalTransferSize,
          spendTime: Math.round(totalSpendTime * 100) / 100
        }
      };
    })
    .catch(debugString => {
      this.artifact = {
        value: -1,
        debugString
      };
    });
  }
}

module.exports = LinksBlockingFirstPaint;
