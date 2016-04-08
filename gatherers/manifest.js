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

/* global window, fetch */

const Gather = require('./gather');
const manifestParser = require('../helpers/manifest-parser');

class Manifest extends Gather {

  static _loadFromURL(options, manifestURL) {
    if (typeof window !== 'undefined' && 'fetch' in window) {
      const finalURL = (new window.URL(options.driver.url).origin) + '/' + manifestURL;
      return fetch(finalURL).then(response => response.text());
    }

    return new Promise((resolve, reject) => {
      const url = require('url');
      const request = require('request');
      const finalURL = url.resolve(options.url, manifestURL);

      request(finalURL, function(err, response, body) {
        if (err || response.statusCode >= 400) {
          return reject(`${response.statusCode}: ${response.statusMessage}`);
        }

        resolve(body);
      });
    });
  }

  static _errorManifest(errorString) {
    return {
      manifest: {
        raw: undefined,
        value: undefined,
        debugString: errorString
      }
    };
  }

  afterPageLoad(options) {
    const driver = options.driver;
    /**
     * This re-fetches the manifest separately, which could
     * potentially lead to a different asset. Using the original manifest
     * resource is tracked in issue #83
     */
    return driver.querySelector('head link[rel="manifest"]')
      .then(node => {
        if (!node) {
          this.artifact = this._errorManifest('No <link rel="manifest"> found in DOM.');
          return;
        }

        return node.getAttribute('href').then(manifestURL => {
          if (!manifestURL) {
            this.artifact = this._errorManifest('No href found on <link rel="manifest">.');
            return;
          }

          return Manifest._loadFromURL(options, manifestURL)
            .then(manifestContent => {
              this.artifact = {
                manifest: manifestParser(manifestContent)
              };
            })
            .catch(reason => {
              this.artifact = this._errorManifest(
                `Unable to fetch manifest at ${manifestURL}: ${reason}.`
              );
            });
        });
      });
  }
}

module.exports = Manifest;
