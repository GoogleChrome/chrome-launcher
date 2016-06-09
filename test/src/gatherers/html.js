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

const HTMLGather = require('../../../src/gatherers/html');
const assert = require('assert');
let htmlGather;

describe('HTML gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    htmlGather = new HTMLGather();
  });

  it('returns an artifact', () => {
    return htmlGather.afterPass({
      driver: {
        sendCommand(cmd) {
          switch (cmd) {
            case 'DOM.getDocument':
              return Promise.resolve({
                root: {
                  nodeId: 1
                }
              });

            case 'DOM.getOuterHTML':
              return Promise.resolve({
                outerHTML: [
                  '<!doctype html>',
                  '<html>',
                  '<head><title>Doc</title></head>',
                  '<body>Hello!</body>',
                  '</html>'
                ].join('\n')
              });

            default:
              throw new Error('Unsupported command');
          }
        }
      }
    }).then(_ => {
      assert.ok(typeof htmlGather.artifact === 'string');
      assert.ok(/<!doctype/gim.test(htmlGather.artifact));
      assert.ok(/Hello/gim.test(htmlGather.artifact));
    });
  });

  it('handles driver failure', () => {
    return htmlGather.afterPass({
      driver: {
        sendCommand() {
          return Promise.reject('such a fail');
        }
      }
    }).then(_ => {
      assert(false);
    }).catch(_ => {
      assert.ok('value' in htmlGather.artifact);
      assert.ok('debugString' in htmlGather.artifact);
    });
  });
});
