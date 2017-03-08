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

const TableFormatter = require('../../formatters/table.js');
const Handlebars = require('handlebars');
const handlebarHelpers = require('../../report/handlebar-helpers.js');
const assert = require('assert');

describe('TableFormatter', () => {
  after(() => {
    Object.keys(handlebarHelpers).forEach(Handlebars.unregisterHelper, Handlebars);
  });

  const extendedInfo = {
    tableHeadings: {
      url: 'URL', lineCol: 'Line/col', code: 'Snippet', isEval: 'Eval\'d?',
      pre: 'Code', preview: 'Preview'},
    results: [{
      url: 'http://example.com',
      line: 123,
      col: 456,
      code: 'code snippet',
      isEval: true,
      pre: 'pre snippet',
      preview: {url: 'http://example.com/(format:webp)/i.jpg', mimeType: 'image/jpeg'}
    }]
  };

  it('generates valid html output', () => {
    Handlebars.registerHelper(handlebarHelpers);

    const formatter = TableFormatter.getFormatter('html');
    const template = Handlebars.compile(formatter);
    const output = template(extendedInfo).split('\n').join('');
    assert.ok(output.match('<table class="table_list'), 'creates a table');
    assert.ok(output.match('multicolumn'), 'adds multicolumn class for large tables');
    assert.ok(output.match(/class=\"[^"]*table-column-preview/), 'adds column className');
    assert.ok(output.match(/class=\"[^"]*table-column-line-col/), 'adds multi-word className');

    const extendedInfoShort = {
      tableHeadings: {url: 'URL', lineCol: 'Line/col'},
      results: extendedInfo.results
    };
    const output2 = template(extendedInfoShort).split('\n').join('');
    assert.ok(!output2.match('multicolumn"'), 'does not add multicolumn class for small tables');
    assert.ok(!output2.match('table-column-preview'),
                             'does not add preview-image class if table does not have images');
  });
});
