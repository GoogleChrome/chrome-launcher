/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/* global document, XMLHttpRequest */

var manifestParser = require('../helpers/manifest-parser');

/**
 * Gather data by running JS in page's context.
 */

function fetchManifest() {
  var link = document.querySelector('link[rel=manifest]');

  if (!link) {
    return 'Manifest link not found.';
  }

  var request = new XMLHttpRequest();
  request.open('GET', link.href, false);  // `false` makes the request synchronous
  request.send(null);

  if (request.status === 200) {
    return request.responseText;
  }

  return 'Unable to fetch manifest at ' + link;
}

var JSGatherer = {
  run: function(driver, url) {
    return driver.evaluateFunction(url, fetchManifest)
      .then(result => manifestParser(result.value))
      .then(parsedManifest => ({parsedManifest}));
  }
};

module.exports = JSGatherer;
