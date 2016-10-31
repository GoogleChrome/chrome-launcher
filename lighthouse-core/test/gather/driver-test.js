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

const Driver = require('../../gather/driver.js');
const Connection = require('../../gather/connections/connection.js');
const Element = require('../../lib/element.js');
const NetworkRecorder = require('../../lib/network-recorder');
const assert = require('assert');

const connection = new Connection();
const driverStub = new Driver(connection);

function createOnceStub(events) {
  return (eventName, cb) => {
    if (events[eventName]) {
      return cb(events[eventName]);
    }

    throw Error(`Stub not implemented: ${eventName}`);
  };
}

function createSWRegistration(id, url, isDeleted) {
  return {
    isDeleted: !!isDeleted,
    registrationId: id,
    scopeURL: url,
  };
}

function createActiveWorker(id, url, controlledClients) {
  return {
    registrationId: id,
    scriptURL: url,
    controlledClients,
  };
}

connection.sendCommand = function(command, params) {
  switch (command) {
    case 'DOM.getDocument':
      return Promise.resolve({root: {nodeId: 249}});
    case 'DOM.querySelector':
      return Promise.resolve({
        nodeId: params.selector === 'invalid' ? 0 : 231
      });
    case 'ServiceWorker.enable':
    case 'ServiceWorker.disable':
      return Promise.resolve();
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

describe('Multiple tab check', () => {
  it('will pass if there are no current service workers', () => {
    const pageUrl = 'https://example.com/';
    driverStub.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations: []
      },
      'ServiceWorker.workerVersionUpdated': {
        versions: []
      }
    });

    return driverStub.assertNoSameOriginServiceWorkerClients(pageUrl);
  });

  it('will pass if there is an active service worker for a different origin', () => {
    const pageUrl = 'https://example.com/';
    const secondUrl = 'https://example.edu';
    const swUrl = `${secondUrl}sw.js`;

    const registrations = [
      createSWRegistration(1, secondUrl),
    ];
    const versions = [
      createActiveWorker(1, swUrl, ['uniqueId'])
    ];

    driverStub.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations
      },
      'ServiceWorker.workerVersionUpdated': {
        versions
      }
    });

    return driverStub.assertNoSameOriginServiceWorkerClients(pageUrl);
  });

  it('will fail if a service worker with a matching origin has a controlled client', () => {
    const pageUrl = 'https://example.com/';
    const swUrl = `${pageUrl}sw.js`;
    const registrations = [
      createSWRegistration(1, pageUrl),
    ];
    const versions = [
      createActiveWorker(1, swUrl, ['uniqueId'])
    ];

    driverStub.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations
      },
      'ServiceWorker.workerVersionUpdated': {
        versions
      }
    });

    return driverStub.assertNoSameOriginServiceWorkerClients(pageUrl)
      .then(_ => assert.ok(false),
          err => {
            assert.ok(err.message.toLowerCase().includes('multiple tabs'));
          });
  });

  it('will succeed if a service worker with a matching origin has no controlled clients', () => {
    const pageUrl = 'https://example.com/';
    const swUrl = `${pageUrl}sw.js`;
    const registrations = [createSWRegistration(1, pageUrl)];
    const versions = [createActiveWorker(1, swUrl, [])];

    driverStub.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations
      },
      'ServiceWorker.workerVersionUpdated': {
        versions
      }
    });

    return driverStub.assertNoSameOriginServiceWorkerClients(pageUrl);
  });
});
