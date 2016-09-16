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

const UserTimingsFormatter = require('../../formatters/user-timings.js');
const assert = require('assert');

/* global describe, it */

describe('Formatter', () => {
  it('handles invalid input', () => {
    const pretty = UserTimingsFormatter.getFormatter('pretty');
    assert.doesNotThrow(_ => pretty());
    assert.doesNotThrow(_ => pretty({}));
  });

  it('handles valid input', () => {
    const pretty = UserTimingsFormatter.getFormatter('pretty');
    const output = pretty([{
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
    }]);
    assert.ok(/mark/.test(output));
    assert.ok(/start: 10/.test(output));
    assert.ok(/measure/.test(output));
    assert.ok(/duration: 1500/.test(output));
  });
});
