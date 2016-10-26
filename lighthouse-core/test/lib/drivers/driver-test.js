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

const Driver = require('../../../gather/driver.js');
const Connection = require('../../../gather/connections/connection.js');
const Element = require('../../../lib/element.js');
const NetworkRecorder = require('../../../lib/network-recorder');
const assert = require('assert');

const connection = new Connection();
const driverStub = new Driver(connection);

connection.sendCommand = function(command, params) {
  switch (command) {
    case 'DOM.getDocument':
      return Promise.resolve({root: {nodeId: 249}});
    case 'DOM.querySelector':
      return Promise.resolve({
        nodeId: params.selector === 'invalid' ? 0 : 231
      });
    default:
      throw Error(`Stub not implemented: ${command}`);
  }
};

// mock redirects to test out enableUrlUpdateIfRedirected
const req1 = {
  url: 'http://aliexpress.com/'
};
const req2 = {
  redirectSource: req1,
  url: 'http://www.aliexpress.com/'
};
const req3 = {
  redirectSource: req2,
  url: 'http://m.aliexpress.com/?tracelog=wwwhome2mobilesitehome'
};
const mockRedirects = [req1, req2, req3];

/* global describe, it */
describe('Browser Driver', () => {
  it('returns null when DOM.querySelector finds no node', () => {
    return driverStub.querySelector('invalid').then(value => {
      assert.equal(value, null);
    });
  });

  it('returns element when DOM.querySelector finds node', () => {
    return driverStub.querySelector('meta head').then(value => {
      assert.equal(value instanceof Element, true);
    });
  });

  it('will update the options.url through redirects', () => {
    const networkRecorder = driverStub._networkRecorder = new NetworkRecorder([]);
    const opts = {url: req1.url};
    driverStub.enableUrlUpdateIfRedirected(opts);

    // Fake some reqFinished events
    const networkManager = networkRecorder.networkManager;
    mockRedirects.forEach(request => {
      networkManager.dispatchEventToListeners(networkRecorder.EventTypes.RequestFinished, request);
    });

    // The above event is handled synchronously by enableUrlUpdateIfRedirected and will be all set
    assert.notEqual(opts.url, req1.url, 'opts.url changed after the redirects');
    assert.equal(opts.url, req3.url, 'opts.url matches the last redirect');
  });
});
