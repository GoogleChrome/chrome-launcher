/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */
const assert = require('assert');

require('../../bin');

describe('CLI bin', function() {
  it('all options should have descriptions', () => {
    const yargs = require('yargs');

    const optionGroups = yargs.getGroups();
    const allOptions = [];
    Object.keys(optionGroups).forEach(key => {
      allOptions.push(...optionGroups[key]);
    });
    const optionsWithDescriptions = Object.keys(yargs.getUsageInstance().getDescriptions());

    allOptions.forEach(opt => {
      assert.ok(optionsWithDescriptions.includes(opt), `cli option '${opt}' has no description`);
    });
  });
});
