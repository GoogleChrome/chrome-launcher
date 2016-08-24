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

const Gatherer = require('./gatherer');
const manifestParser = require('../../lib/manifest-parser');

class Manifest extends Gatherer {

  static _errorManifest(errorString) {
    return {
      raw: undefined,
      value: undefined,
      debugString: errorString
    };
  }

  afterPass(options) {
    const driver = options.driver;
    /**
     * This re-fetches the manifest separately, which could
     * potentially lead to a different asset. Using the original manifest
     * resource is tracked in issue #83
     */
    return driver.sendCommand('Page.getAppManifest')
      .then(response => {
        if (response.errors.length) {
          let errorString;
          if (response.url) {
            errorString = `Unable to retrieve manifest at ${response.url}: `;
          }
          this.artifact = Manifest._errorManifest(errorString + response.errors.join(', '));
          return;
        }

        // The driver will return an empty string for url and the data if the
        // page has no manifest.
        if (!response.data.length && !response.data.url) {
          this.artifact = Manifest._errorManifest('No manifest found.');
          return;
        }

        this.artifact = manifestParser(response.data, response.url, options.url);
      }, _ => {
        this.artifact = Manifest._errorManifest('Unable to retrieve manifest');
        return;
      });
  }
}

module.exports = Manifest;
