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

function swVersionUpdated(url, data) {
  var swObj = data.versions.filter(sw => sw.scriptURL.includes(url)).pop();

  // eventually we will want until a specific state is reached inside of the
  // service worker to resolve this.
  return Promise.resolve(swObj);
}

var ServiceWorkerGatherer = {
  run: function(driver, url) {
    return new Promise((resolve, reject) => {
      // hacky settimeout to delay SW work from page loading
      setTimeout(_ => {
        driver.subscribeToServiceWorkerDetails(swVersionUpdated.bind(null, url)).then(data => {
          return resolve({serviceWorker: data});
        });
      }, 5 * 1000);
    });
  }
};

module.exports = ServiceWorkerGatherer;
