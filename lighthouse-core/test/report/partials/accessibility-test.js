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
    '/../../../report/partials/accessibility.html', 'utf8');

describe('Accessibility partial generation', () => {
  after(() => {
    Object.keys(handlebarHelpers).forEach(Handlebars.unregisterHelper, Handlebars);
  });

  it('generates valid html output', () => {
    Handlebars.registerHelper(handlebarHelpers);

    const template = Handlebars.compile(partialHtml);

    let output = template({nodes: [{target: 'some-id'}]});
    assert.ok(output.match(/1 element failed this test/g), 'msg for one input');
    assert.ok(output.match(/<code>some-id<\/code>/g));

    output = template({nodes: [{target: 'some-id'}, {target: 'some-id2'}]});
    assert.ok(output.match(/2 elements fail this test/g), 'msg for more than one input');
    assert.ok(output.match(/<code>some-id<\/code>/g));
    assert.ok(output.match(/<code>some-id2<\/code>/g));
  });
});
