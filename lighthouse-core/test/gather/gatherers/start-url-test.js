/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const URL = require('../../../lib/url-shim');
const StartUrlGatherer = require('../../../gather/gatherers/start-url');
const assert = require('assert');
const tracingData = require('../../fixtures/traces/network-records.json');

const mockDriver = {
  goOffline() {
    return Promise.resolve();
  },
  goOnline() {
    return Promise.resolve();
  },
  off() {}
};

const wrapSendCommand = (mockDriver, url) => {
  mockDriver = Object.assign({}, mockDriver);
  mockDriver.evaluateAsync = () => {
    url = new URL(url);
    url.hash = '';

    const record = findRequestByUrl(url.href);
    if (!record) {
      return Promise.reject(-1);
    }

    return Promise.resolve(record.statusCode);
  };

  mockDriver.on = (name, cb) => {
    if (name === 'Network.requestWillBeSent') {
      cb({
        request: {
          url,
          requestId: 1
        }
      });
    }

    if (name === 'Network.loadingFinished') {
      cb({
        request: {
          url,
          requestId: 1
        }
      });
    }
  };

  mockDriver.getAppManifest = () => {
    return Promise.resolve({
      data: '{"start_url": "' + url + '"}',
      errors: [],
      url,
    });
  };

  return mockDriver;
};

const findRequestByUrl = (url) => {
  return tracingData.networkRecords.find(record => record._url === url);
};

describe('Start-url gatherer', () => {
  it('returns an artifact set to -1 when offline loading fails', () => {
    const startUrlGatherer = new StartUrlGatherer();
    const startUrlGathererWithQueryString = new StartUrlGatherer();
    const options = {
      url: 'https://do-not-match.com/',
      driver: wrapSendCommand(mockDriver, 'https://do-not-match.com/')
    };
    const optionsWithQueryString = {
      url: 'https://ifixit-pwa.appspot.com/?history',
      driver: wrapSendCommand(mockDriver, 'https://ifixit-pwa.appspot.com/?history')
    };

    return Promise.all([
      startUrlGatherer.pass(options)
        .then(_ => startUrlGatherer.afterPass(options, tracingData)),
      startUrlGathererWithQueryString.pass(optionsWithQueryString)
        .then(_ => startUrlGathererWithQueryString.afterPass(optionsWithQueryString, tracingData))
    ]).then(([artifact, artifactWithQueryString]) => {
      assert.strictEqual(artifact, -1);
      assert.strictEqual(artifactWithQueryString, -1);
    });
  });

  it('returns an artifact set to 200 when offline loading succeeds', () => {
    const startUrlGatherer = new StartUrlGatherer();
    const startUrlGathererWithFragment = new StartUrlGatherer();
    const options = {
      url: 'https://ifixit-pwa.appspot.com/',
      driver: wrapSendCommand(mockDriver, 'https://ifixit-pwa.appspot.com/')
    };
    const optionsWithQueryString = {
      url: 'https://ifixit-pwa.appspot.com/#/history',
      driver: wrapSendCommand(mockDriver, 'https://ifixit-pwa.appspot.com/#/history')
    };

    return Promise.all([
      startUrlGatherer.pass(options)
        .then(_ => startUrlGatherer.afterPass(options, tracingData)),
      startUrlGathererWithFragment.pass(optionsWithQueryString)
        .then(_ => startUrlGathererWithFragment.afterPass(optionsWithQueryString, tracingData))
    ]).then(([artifact, artifactWithFragment]) => {
      assert.strictEqual(artifact, 200);
      assert.strictEqual(artifactWithFragment, 200);
    });
  });

  it('returns an error when manifest cannot be found', () => {
    const startUrlGatherer = new StartUrlGatherer();
    const options = {
      url: 'https://ifixit-pwa.appspot.com/',
      driver: wrapSendCommand(mockDriver, '')
    };

    startUrlGatherer.pass(options)
      .then(_ => startUrlGatherer.afterPass(options, tracingData))
      .then(_ => {
        assert.ok(false, 'should fail because manifest is empty');
      })
      .catch(err => {
        assert.strictEqual(err.message, `No web app manifest found on page ${options.url}`);
      });
  });

  it('returns an error when origin is not the same', () => {
    const startUrlGatherer = new StartUrlGatherer();
    const options = {
      url: 'https://ifixit-pwa.appspot.com/',
      driver: wrapSendCommand(mockDriver, 'https://not-same-origin.com/')
    };

    startUrlGatherer.pass(options)
      .then(_ => startUrlGatherer.afterPass(options, tracingData))
      .then(_ => {
        assert.ok(false, 'should fail because origin is not the same');
      })
      .catch(err => {
        assert.strictEqual(err.message, 'ERROR: start_url must be same-origin as document');
      });
  });
});
