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

'use strict';

class ServiceWorkerTest {

  /**
   * Runs the Minify HTML Test. Looks for minified HTML.
   * @param  {*} input The test input.
   * @return {Number} A score. 1 = 100% minified; 0 = 0% minified.
   */
  run (input, loader) {

    if (input.length < 1) {
      return Promise.reject('No data provided.');
    }

    if (typeof input.driver !== 'object') {
      return Promise.reject('Input is not an object. Probably not a driver');
    }

    if (typeof input.url !== 'string') {
      return Promise.reject('URL not provided.');
    }

    return new Promise((resolve, reject) => {
      let driver = input.driver;
      let browser = driver.browser;
      driver.flow([
        () => {
          browser.get(input.url);
        },

        () => {
          // Allow the browser to wait some time before failing the scroll.
          browser.manage().timeouts().setScriptTimeout(15000);

          browser
              .executeAsyncScript(function () {
                var cb = arguments[arguments.length - 1];

                function go () {

                  if (!('serviceWorker' in navigator)) {
                    return cb(null);
                  }

                  navigator.serviceWorker.getRegistration()
                      .then(function (reg) {

                        if (typeof reg === 'undefined') {
                          return cb(null);
                        }

                        console.log(reg, reg.active,
                            reg.waiting, reg.installing);

                        var scriptURL = null;

                        if (reg.active !== null) {
                          scriptURL = reg.active.scriptURL;
                        }

                        if (reg.waiting !== null) {
                          scriptURL = reg.waiting.scriptURL;
                        }

                        if (reg.installing !== null) {
                          scriptURL = reg.installing.scriptURL;
                        }

                        return cb(scriptURL);
                      });
                }

                // Poll-wait until the page is ready then wait another second
                // to see if a Service Worker is registered. The test needs to
                // an awful lot better than this.
                if (document.readyState !== 'complete') {
                  var poll = setInterval(function () {
                    if (document.readyState === 'complete') {
                      clearInterval(poll);

                      setTimeout(go, 1000);
                    }
                  }, 100);
                } else {
                  setTimeout(go, 1000);
                }
              })
              .then((serviceWorkerPath) => {

                let result = {
                  registered: (serviceWorkerPath !== ''),
                  fetch: false
                };

                if (result.registered) {

                  if (serviceWorkerPath === null) {
                    return resolve(result);
                  }

                  // Get the Service Worker JS. We need a nicer way to do this!
                  return input.loader.load(serviceWorkerPath)
                      .then(fileContents => {
                        result.fetch = this.hasFetchRegistered(fileContents);
                        return resolve(result);
                      });
                }

                return resolve(result);
              });
        }
      ]);
    });
  }

  hasFetchRegistered (fileContents) {

    let matchSelfFetch = /self\.onfetch/igm;
    let matchAddEventListener = /self\.addEventListener\s?\(\s?'fetch'/igm;

    return (matchSelfFetch.test(fileContents) ||
        matchAddEventListener.test(fileContents));
  }
}

module.exports = new ServiceWorkerTest();
