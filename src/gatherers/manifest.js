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
const manifestParser = require('../lib/manifest-parser');

/* global document, XMLHttpRequest, __returnResults */

function getManifestContent() {
  function post(response) {
    // __returnResults is magically inserted by driver.evaluateAsync
    __returnResults(response);
  }

  const manifestNode = document.querySelector('link[rel=manifest]');
  if (!manifestNode) {
    return post({error: 'No <link rel="manifest"> found in DOM.'});
  }

  const manifestURL = manifestNode.href;
  if (!manifestURL) {
    return post({error: 'No href found on <link rel="manifest">.'});
  }

  const req = new XMLHttpRequest();
  req.open('GET', manifestURL);
  req.onload = function() {
    if (req.status !== 200) {
      return post({
        error: `Unable to fetch manifest at \
          ${manifestURL}: ${req.status} - ${req.statusText}`
      });
    }

    post({manifestContent: req.response});
  };
  req.send();
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

  postProfiling(options) {
    const driver = options.driver;
    /**
     * This re-fetches the manifest separately, which could
     * potentially lead to a different asset. Using the original manifest
     * resource is tracked in issue #83
     */
    return driver.evaluateAsync(`(${getManifestContent.toString()}())`)

    .then(returnedValue => {
      if (!returnedValue) {
        this.artifact = Manifest._errorManifest('Unable to retrieve manifest');
        return;
      }

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
