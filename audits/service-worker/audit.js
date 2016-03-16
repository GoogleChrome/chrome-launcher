/**
 * Copyright 2015 Google Inc. All rights reserved.
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

function hasFetchRegistered(fileContents) {
  // Get the Service Worker JS. We need a nicer way to do this!
  // return inputs.loader.load(serviceWorkerPath)
  //     .then(fileContents => {
  //       result.fetch = this.hasFetchRegistered(fileContents);
  //       return resolve(result);
  //     });

  var matchSelfFetch = /self\.onfetch/igm;
  var matchAddEventListener = /self\.addEventListener\s?\(\s?'fetch'/igm;

  return (matchSelfFetch.test(fileContents) ||
      matchAddEventListener.test(fileContents));
}

module.exports = function(data) {
  if (data.serviceWorker === undefined) {
    throw new Error('Service worker auditor requires service worker data');
  }

  return Promise.resolve({
    hasFetchRegistered: hasFetchRegistered(data.serviceWorker)
  });
};
