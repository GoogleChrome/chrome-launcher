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

const Driver = require('../../../driver/drivers/cri.js');
const Element = require('../../../lib/element.js');
const assert = require('assert');

let DriverStub = new Driver();

DriverStub.sendCommand = function(command, params) {
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

/* global describe, it */
describe('Browser Driver', () => {
  it('returns null when DOM.querySelector finds no node', () => {
    return DriverStub.querySelector('invalid').then(value => {
      assert.equal(value, null);
    });
  });

  it('returns element when DOM.querySelector finds node', () => {
    return DriverStub.querySelector('meta head').then(value => {
      assert.equal(value instanceof Element, true);
    });
  });
});
