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

const UserTimingsFormatter = require('../../formatters/user-timings.js');
const assert = require('assert');
const Handlebars = require('handlebars');
const handlebarHelpers = require('../../report/handlebar-helpers');

describe('User Timings Formatter', () => {
  after(() => {
    Object.keys(handlebarHelpers).forEach(Handlebars.unregisterHelper, Handlebars);
  });

  it('generates valid html output', () => {
    const extendedInfo = [{
      isMark: true,
      name: 'one',
      startTime: 10,
      endTime: 1000,
      duration: 990
    }, {
      isMark: false,
      name: 'two',
      startTime: 1000,
      endTime: 2500,
      duration: 1500
    }];

    Handlebars.registerHelper(handlebarHelpers);

    const formatter = UserTimingsFormatter.getFormatter('html');
    const template = Handlebars.compile(formatter);
    const output = template(extendedInfo).split('\n').join('');

    assert.ok(/Mark: 10/.test(output));
    assert.ok(/one/.test(output));
    assert.ok(/two/.test(output));
    assert.ok(/Measure 1500/.test(output));
  });
});
