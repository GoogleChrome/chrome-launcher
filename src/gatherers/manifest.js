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

const Gather = require('./gather');
const manifestParser = require('../helpers/manifest-parser');

/* global document, XMLHttpRequest */

function getManifestContent() {
  const manifestNode = document.querySelector('link[rel=manifest]');
  if (!manifestNode) {
    return {error: 'No <link rel="manifest"> found in DOM.'};
  }

  const manifestURL = manifestNode.href;
  if (!manifestURL) {
    return {error: 'No href found on <link rel="manifest">.'};
  }

  const req = new XMLHttpRequest();
  req.open('GET', manifestURL, false);
  req.send();
  if (req.status >= 400) {
    return {
      error: `Unable to fetch manifest at \
        ${manifestURL}: ${req.status} - ${req.statusText}`
    };
  }

  return {manifestContent: req.response};
}

class Manifest extends Gather {

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
    return driver.sendCommand('Runtime.evaluate', {
      expression: `(${getManifestContent.toString()}())`,
      returnByValue: true
    }).then(returnedData => {
      if (returnedData.result.value === undefined ||
          returnedData.result.value === null ||
          returnedData.result.value === {}) {
       // The returned object from Runtime.evaluate is an enigma
       // Sometimes if the returned object is not easily serializable,
       // it sets value = {}
        throw new Error('Manifest gather error: ' +
          'Failed to get proper result from runtime eval');
      }

      const returnedValue = returnedData.result.value;

      if (returnedValue.error) {
        this.artifact = Manifest._errorManifest(returnedValue.error);
      } else {
        this.artifact = {
          manifest: manifestParser(returnedValue.manifestContent)
        };
      }
    });
  }
}

module.exports = Manifest;
