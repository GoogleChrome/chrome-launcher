/**
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

/* global window, fetch */

const Gather = require('./gather');

class Manifest extends Gather {

  static loadFromURL(options, manifestURL) {
    if (typeof window !== 'undefined') {
      const finalURL = (new window.URL(options.driver.url).origin) + manifestURL;
      return fetch(finalURL).then(response => response.text());
    }

    return new Promise((resolve, reject) => {
      const url = require('url');
      const request = require('request');
      const finalURL = url.resolve(options.url, manifestURL);

      request(finalURL, function(err, response, body) {
        if (err) {
          return resolve('');
        }

        resolve(body);
      });
    });
  }

  static gather(options) {
    const driver = options.driver;

    return driver.sendCommand('DOM.getDocument')
        .then(result => result.root.nodeId)
        .then(nodeId => driver.sendCommand('DOM.querySelector', {
          nodeId: nodeId,
          selector: 'link[rel="manifest"]'
        }))
        .then(manifestNode => manifestNode.nodeId)
        .then(manifestNodeId => {
          if (manifestNodeId === 0) {
            return '';
          }

          return driver.sendCommand('DOM.getAttributes', {
            nodeId: manifestNodeId
          })
          .then(manifestAttributes => manifestAttributes.attributes)
          .then(attributes => {
            const hrefIndex = attributes.indexOf('href');
            if (hrefIndex === -1) {
              return '';
            }

            return attributes[hrefIndex + 1];
          })
          .then(manifestURL => Manifest.loadFromURL(options, manifestURL));
        })
        .then(manifest => ({manifest}));
  }
}

module.exports = Manifest;
