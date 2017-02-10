/**
 * Copyright 2017 Google Inc. All rights reserved.
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

const GeolocationOnStart =
    require('../../../../gather/gatherers/dobetterweb/geolocation-on-start');
const assert = require('assert');

describe('Geolocation permission on page load', () => {
  let gatherer;

  const opts = {
    url: 'http://localhost:8080',
    driver: {
      evaluateAsync() {
        return Promise.resolve(false);
      },
      queryPermissionState() {
        return Promise.resolve('granted');
      },
      captureFunctionCallSites() {
        return Promise.resolve([]);
      }
    }
  };

  beforeEach(() => {
    gatherer = new GeolocationOnStart();
  });

  it('throws when the URL is not a secure context', () => {
    gatherer.beforePass(opts);
    return gatherer.afterPass(opts).then(_ => {
      assert.ok(false);
    }).catch(err => {
      assert.ok(err.message.match(/Geolocation API requires an https/));
      assert.ok(true);
    });
  });

  it('throws when the permission has already been granted/denied', () => {
    opts.driver.evaluateAsync = _ => Promise.resolve(true);

    gatherer.beforePass(opts);
    return gatherer.afterPass(opts).then(_ => {
      assert.ok(false);
    }).catch(err => {
      assert.ok(err.message.match(/already granted/));
      assert.ok(err.message.match(/Try resetting the permission/));
      assert.ok(true);
    });
  });
});
