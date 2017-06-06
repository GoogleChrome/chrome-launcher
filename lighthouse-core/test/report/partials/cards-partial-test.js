/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const Handlebars = require('handlebars');
const assert = require('assert');
const fs = require('fs');
const partialHtml = fs.readFileSync(__dirname + '/../../../report/partials/cards.html', 'utf8');

describe('Cards partial generation', () => {
  const extendedInfo = {
    value: [
      {title: 'Total DOM Nodes', value: 3500, target: '1,500 nodes'},
      {title: 'DOM Depth', value: 10, snippet: 'snippet'},
      {title: 'Maximum Children', value: 20, snippet: 'snippet2', target: 20}
    ]
  };

  it('generates valid html output', () => {
    const template = Handlebars.compile(partialHtml);
    const output = template(extendedInfo.value).split('\n').join('');
    assert.ok(output.match('title="snippet"'), 'adds title attribute for snippet');
    assert.ok(output.match('class="cards__container"'), 'adds wrapper class');
    assert.ok(output.match('target: 1,500 nodes'), 'adds target val html');
    assert.ok(!output.match('target: 10'), 'omits target html without a value');
    assert.equal(output.match(/class=\"[^"]*scorecard-value/g).length, extendedInfo.value.length);
    assert.equal(output.match(/class=\"[^"]*scorecard-title/g).length, extendedInfo.value.length);
  });
});
