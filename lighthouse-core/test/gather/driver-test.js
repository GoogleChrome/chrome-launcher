/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

let sendCommandParams = [];

const Driver = require('../../gather/driver.js');
const Connection = require('../../gather/connections/connection.js');
const Element = require('../../lib/element.js');
const assert = require('assert');
const EventEmitter = require('events').EventEmitter;

const connection = new Connection();
const driverStub = new Driver(connection);

const redirectDevtoolsLog = require('../fixtures/wikipedia-redirect.devtoolslog.json');

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

function createActiveWorker(id, url, controlledClients, status = 'activated') {
  return {
    registrationId: id,
    scriptURL: url,
    controlledClients,
    status,
  };
}

connection.sendCommand = function(command, params) {
  sendCommandParams.push({command, params});
  switch (command) {
    case 'DOM.getDocument':
      return Promise.resolve({root: {nodeId: 249}});
    case 'DOM.querySelector':
      return Promise.resolve({
        nodeId: params.selector === 'invalid' ? 0 : 231
      });
    case 'DOM.querySelectorAll':
      return Promise.resolve({
        nodeIds: params.selector === 'invalid' ? [] : [231]
      });
    case 'Runtime.getProperties':
      return Promise.resolve({
        result: params.objectId === 'invalid' ? [] : [{
          name: 'test',
          value: {
            value: '123'
          }
        }, {
          name: 'novalue'
        }]
      });
    case 'Page.enable':
    case 'Tracing.start':
    case 'ServiceWorker.enable':
    case 'ServiceWorker.disable':
      return Promise.resolve();
    case 'Tracing.end':
      return Promise.reject(new Error('tracing not started'));
    default:
      throw Error(`Stub not implemented: ${command}`);
  }
};

/* eslint-env mocha */

describe('Browser Driver', () => {
  beforeEach(() => {
    sendCommandParams = [];
  });

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

  it('returns [] when DOM.querySelectorAll finds no node', () => {
    return driverStub.querySelectorAll('invalid').then(value => {
      assert.deepEqual(value, []);
    });
  });

  it('returns element when DOM.querySelectorAll finds node', () => {
    return driverStub.querySelectorAll('a').then(value => {
      assert.equal(value.length, 1);
      assert.equal(value[0] instanceof Element, true);
    });
  });

  it('returns value when getObjectProperty finds property name', () => {
    return driverStub.getObjectProperty('test', 'test').then(value => {
      assert.deepEqual(value, 123);
    });
  });

  it('returns null when getObjectProperty finds no property name', () => {
    return driverStub.getObjectProperty('invalid', 'invalid').then(value => {
      assert.deepEqual(value, null);
    });
  });

  it('returns null when getObjectProperty finds property name with no value', () => {
    return driverStub.getObjectProperty('test', 'novalue').then(value => {
      assert.deepEqual(value, null);
    });
  });

  it('will track redirects through gotoURL load', () => {
    const delay = _ => new Promise(resolve => setTimeout(resolve));

    class ReplayConnection extends EventEmitter {
      connect() {
        return Promise.resolve();
      }
      disconnect() {
        return Promise.resolve();
      }
      replayLog() {
        redirectDevtoolsLog.forEach(msg => this.emit('notification', msg));
      }
      sendCommand(method) {
        const resolve = Promise.resolve();

        // If navigating, wait, then replay devtools log in parallel to resolve.
        if (method === 'Page.navigate') {
          resolve.then(delay).then(_ => this.replayLog());
        }

        return resolve;
      }
    }
    const replayConnection = new ReplayConnection();
    const driver = new Driver(replayConnection);

    // Redirect in log will go through
    const startUrl = 'http://en.wikipedia.org/';
    // then https://en.wikipedia.org/
    // then https://en.wikipedia.org/wiki/Main_Page
    const finalUrl = 'https://en.m.wikipedia.org/wiki/Main_Page';

    const loadOptions = {
      waitForLoad: true,
      config: {
        networkQuietThresholdMs: 1
      }
    };

    return driver.gotoURL(startUrl, loadOptions).then(loadedUrl => {
      assert.equal(loadedUrl, finalUrl);
    });
  });

  it('waits for tracingComplete when tracing already started', () => {
    const fakeConnection = new Connection();
    const fakeDriver = new Driver(fakeConnection);
    const commands = [];
    fakeConnection.sendCommand = evt => {
      commands.push(evt);
      return Promise.resolve();
    };

    fakeDriver.once = createOnceStub({'Tracing.tracingComplete': {}});
    return fakeDriver.beginTrace().then(() => {
      assert.deepEqual(commands, ['Page.enable', 'Tracing.end', 'Tracing.start']);
    });
  });

  it('will request default traceCategories', () => {
    return driverStub.beginTrace().then(() => {
      const traceCmd = sendCommandParams.find(obj => obj.command === 'Tracing.start');
      const categories = traceCmd.params.categories;
      assert.ok(categories.includes('devtools.timeline'), 'contains devtools.timeline');
    });
  });

  it('will use requested additionalTraceCategories', () => {
    return driverStub.beginTrace({additionalTraceCategories: 'v8,v8.execute,toplevel'}).then(() => {
      const traceCmd = sendCommandParams.find(obj => obj.command === 'Tracing.start');
      const categories = traceCmd.params.categories;
      assert.ok(categories.includes('blink'), 'contains default categories');
      assert.ok(categories.includes('v8.execute'), 'contains added categories');
      assert.ok(categories.indexOf('toplevel') === categories.lastIndexOf('toplevel'),
          'de-dupes categories');
    });
  });
});

describe('Multiple tab check', () => {
  beforeEach(() => {
    sendCommandParams = [];
  });

  it('will pass if there are no current service workers', () => {
    const pageUrl = 'https://example.com/';
    driverStub.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations: []
      },
    });

    driverStub.on = createOnceStub({
      'ServiceWorker.workerVersionUpdated': {
        versions: []
      },
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
    });

    driverStub.on = createOnceStub({
      'ServiceWorker.workerVersionUpdated': {
        versions
      },
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
      }
    });

    driverStub.on = createOnceStub({
      'ServiceWorker.workerVersionUpdated': {
        versions
      },
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
    });

    driverStub.on = createOnceStub({
      'ServiceWorker.workerVersionUpdated': {
        versions
      },
    });

    return driverStub.assertNoSameOriginServiceWorkerClients(pageUrl);
  });

  it('will wait for serviceworker to be activated', () => {
    const pageUrl = 'https://example.com/';
    const swUrl = `${pageUrl}sw.js`;
    const registrations = [createSWRegistration(1, pageUrl)];
    const versions = [createActiveWorker(1, swUrl, [], 'installing')];

    driverStub.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations
      },
    });

    driverStub.on = (eventName, cb) => {
      if (eventName === 'ServiceWorker.workerVersionUpdated') {
        cb({versions});

        setTimeout(() => {
          cb({
            versions: [
              createActiveWorker(1, swUrl, [], 'activated'),
            ]
          });
        }, 1000);

        return;
      }

      throw Error(`Stub not implemented: ${eventName}`);
    };

    return driverStub.assertNoSameOriginServiceWorkerClients(pageUrl);
  });
});
