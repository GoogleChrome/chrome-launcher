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

'use strict';

/* eslint-env mocha */

const pkg = require('../../package.json');
const assert = require('assert');
const path = require('path');
const http = require('http');
const fs = require('fs');

describe('Module Tests', function() {
  this.timeout(60000);

  const PORT = 8180;
  const VALID_TEST_URL = 'http://localhost:' + PORT +
    '/test/fixtures/online-only.html';
  let testServer;
  const serverConnections = [];

  before(function() {
    testServer = http.createServer(function(request, response) {
      try {
        const assetPath = path.join('.', request.url);

        // lstatSync throws if the file doesn't exist.
        fs.lstatSync(assetPath);
        const readStream = fs.createReadStream(assetPath);
        readStream.pipe(response);
      } catch (err) {
        response.end();
      }
    });

    const listener = testServer.listen(PORT, function() {
      console.log('Server listening on: http://localhost:%s', PORT);
    });
    listener.on('connection', function(socket) {
      serverConnections.push(socket);
      socket.on('close', function() {
        serverConnections.splice(serverConnections.indexOf(socket), 1);
      });
    });
  });

  after(function(cb) {
    serverConnections.forEach(function(connection) {
      connection.destroy();
    });
    testServer.close(cb);
  });

  it('should have a main attribute defined in the package.json', function() {
    assert.ok(pkg.main);
  });

  it('should be able to require in the package.json\'s main file', function() {
    const lighthouse = require('../..');
    assert.ok(lighthouse);
  });

  it('should require lighthouse as a function', function() {
    const lighthouse = require('../..');
    assert.ok(typeof lighthouse === 'function');
  });

  it('should be able to run lighthouse with just a url', function() {
    const lighthouse = require('../..');
    return lighthouse(VALID_TEST_URL)
    .then(results => {
      assert.ok(results);
    });
  });

  it('should be able to run lighthouse with just a url and options', function() {
    const lighthouse = require('../..');
    return lighthouse(VALID_TEST_URL, {
      // Prevent regression of github.com/GoogleChrome/lighthouse/issues/345
      saveArtifacts: true
    })
    .then(results => {
      assert.ok(results);
    }).then(_ => {
      fs.unlinkSync('artifacts.log');
    });
  });

  it('should throw an error when the first parameter is not defined', function() {
    const lighthouse = require('../..');
    return lighthouse()
      .then(() => {
        throw new Error('Should not have resolved when first arg is not a string');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the first parameter is an empty string', function() {
    const lighthouse = require('../..');
    return lighthouse('')
      .then(() => {
        throw new Error('Should not have resolved when first arg is an empty string');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the first parameter is not a string', function() {
    const lighthouse = require('../..');
    return lighthouse({})
      .then(() => {
        throw new Error('Should not have resolved when first arg is not a string');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the second parameter is not an object', function() {
    const lighthouse = require('../..');
    return lighthouse(VALID_TEST_URL, 'flags')
      .then(() => {
        throw new Error('Should not have resolved when second arg is not an object');
      }, err => {
        assert.ok(err);
      });
  });
});
