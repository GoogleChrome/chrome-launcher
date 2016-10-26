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

/**
 * Uses the debugger protocol to fetch the manifest from within the context of
 * the target page, reusing any credentials, emulation, etc, already established
 * there. The artifact produced is the fetched string, if any, passed through
 * the manifest parser.
 */
class Manifest extends Gatherer {

  static _errorManifest(errorString) {
    return {
      raw: undefined,
      value: undefined,
      debugString: errorString
    };
  }

  afterPass(options) {
    return options.driver.sendCommand('Page.getAppManifest')
      .then(response => {
        // We're not reading `response.errors` however it may contain critical and noncritical
        // errors from Blink's manifest parser:
        //   https://chromedevtools.github.io/debugger-protocol-viewer/tot/Page/#type-AppManifestError
        if (!response.data) {
          let errorString;
          if (response.url) {
            errorString = `Unable to retrieve manifest at ${response.url}`;
          } else {
            // The driver will return an empty string for url and the data if
            // the page has no manifest.
            errorString = 'No manifest found.';
          }

          this.artifact = Manifest._errorManifest(errorString);
          return;
        }

        this.artifact = manifestParser(response.data, response.url, options.url);
      }, err => {
        this.artifact = Manifest._errorManifest('Unable to retrieve manifest: ' + err);
      });
  }
}

module.exports = Manifest;
