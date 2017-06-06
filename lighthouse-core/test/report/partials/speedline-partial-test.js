/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const Handlebars = require('handlebars');
const assert = require('assert');
const handlebarHelpers = require('../../../report/handlebar-helpers');
const fs = require('fs');
const partialHtml = fs.readFileSync(__dirname +
    '/../../../report/partials/speedline.html', 'utf8');

const mockExtendedInfo = {
  timings: {
    firstVisualChange: 100,
    visuallyComplete: 540,
    speedIndex: 320,
    perceptualSpeedIndex: 321
  },
  timestamps: {
    firstVisualChange: 1100,
    visuallyComplete: 1540,
    speedIndex: 1320,
    perceptualSpeedIndex: 1321
  },
  frames: []
};

describe('Speedline partial generation', () => {
  after(() => {
    Object.keys(handlebarHelpers).forEach(Handlebars.unregisterHelper, Handlebars);
  });

  it('generates valid html output', () => {
    Handlebars.registerHelper(handlebarHelpers);

    const template = Handlebars.compile(partialHtml);
    const formatted = template(mockExtendedInfo).split('\n').join('');

    assert.equal(typeof formatted, 'string');
    assert.ok(formatted.length > 0);
    assert.ok(formatted.includes('100ms'), 'first visual change isnt printed');
    assert.ok(formatted.includes('540ms'), 'last visual change isnt printed');
  });
});
