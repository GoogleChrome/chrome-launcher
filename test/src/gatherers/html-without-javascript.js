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

const HTMLWithoutJavaScriptGather = require('../../../src/gatherers/html-without-javascript');
const assert = require('assert');
let htmlWithoutJavaScriptGather;

describe('HTML without JavaScript gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    htmlWithoutJavaScriptGather = new HTMLWithoutJavaScriptGather();
  });

  it('updates the options', () => {
    const opts = {disableJavaScript: false};
    htmlWithoutJavaScriptGather.beforePass(opts);

    return assert.equal(opts.disableJavaScript, true);
  });

  it('updates the options', () => {
    const opts = {disableJavaScript: false};
    htmlWithoutJavaScriptGather.beforePass(opts);

    return assert.equal(opts.disableJavaScript, true);
  });

  it('resets the options', () => {
    const opts = {
      disableJavaScript: true,
      driver: {
        evaluateAsync() {
          return Promise.resolve('Hello!');
        }
      }
    };
    return htmlWithoutJavaScriptGather
        .afterPass(opts)
        .then(_ => {
          assert.equal(opts.disableJavaScript, false);
        });
  });

  it('returns an artifact', () => {
    return htmlWithoutJavaScriptGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve('Hello!');
        }
      }
    }).then(_ => {
      assert.ok(typeof htmlWithoutJavaScriptGather.artifact === 'string');
      assert.ok(/Hello/gim.test(htmlWithoutJavaScriptGather.artifact));
    });
  });

  it('handles driver failure', () => {
    return htmlWithoutJavaScriptGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.reject('such a fail');
        }
      }
    }).then(_ => {
      assert(false);
    }).catch(_ => {
      assert.ok('value' in htmlWithoutJavaScriptGather.artifact);
      assert.ok('debugString' in htmlWithoutJavaScriptGather.artifact);
    });
  });
});
