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

const ExtensionProtocol = require('../../../lighthouse-core/driver/drivers/extension');
const Runner = require('../../../lighthouse-core/runner');
const config = require('../../../lighthouse-core/config/default.json');
const log = require('../../../lighthouse-core/lib/log');

window.createPageAndPopulate = function(results) {
  const tabURL = chrome.extension.getURL('/pages/report.html');
  chrome.tabs.create({url: tabURL}, tab => {
    // Results will be lost when using sendMessage without waiting for the
    // receiving side to load. Once it loads, we get a message -
    // ready=true. Respond to this message with the results.
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
      if (message && message.ready && sender.tab.id === tab.id) {
        return respond(results);
      }
    });
  });
};

window.runAudits = function(options) {
  // Default to 'info' logging level.
  log.setLevel('info');

  const driver = new ExtensionProtocol();

  return driver.getCurrentTabURL()
      .then(url => {
        // Add in the URL to the options.
        return Runner.run(driver, Object.assign({}, options, {url, config}));
      });
};

chrome.runtime.onInstalled.addListener(details => {
  if (details.previousVersion) {
    console.log('previousVersion', details.previousVersion);
  }
});
