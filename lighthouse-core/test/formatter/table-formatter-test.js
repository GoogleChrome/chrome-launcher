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
const ReportGenerator = require('../../report/report-generator.js');
const assert = require('assert');

describe('TableFormatter', () => {
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
      preview: {url: 'http://example.com/i.jpg', mimeType: 'image/jpeg'}
    }]
  };

  it('handles invalid input', () => {
    const pretty = TableFormatter.getFormatter('pretty');
    assert.equal(pretty(), '');
    assert.equal(pretty(null), '');
    assert.equal(pretty({}), '');
    assert.equal(pretty({results: 'blah'}), '');
  });

  it('createTable() produces formatted rows/cols', () => {
    const table = TableFormatter.createTable(extendedInfo.tableHeadings, extendedInfo.results);
    const headings = extendedInfo.tableHeadings;
    assert.deepEqual(table.headings, Object.keys(headings).map(key => headings[key]));
    assert.equal(table.rows.length, 1);
    assert.equal(table.rows[0].cols.length, Object.keys(headings).length);
    assert.equal(table.rows[0].cols[0], 'http://example.com');
    assert.equal(table.rows[0].cols[1], '123:456');
    assert.equal(table.rows[0].cols[2], '\`code snippet\`');
    assert.equal(table.rows[0].cols[3], 'yes');
    assert.equal(table.rows[0].cols[4], '\`\`\`\npre snippet\`\`\`');
    assert.equal(table.rows[0].cols[5],
        '[![Image preview](http://example.com/i.jpg "Image preview")](http://example.com/i.jpg)');
  });

  it('generates valid pretty output', () => {
    const pretty = TableFormatter.getFormatter('pretty');
    const output = pretty(extendedInfo);
    assert.ok(output.includes(
        '      URL LINE/COL SNIPPET EVAL\'D? CODE PREVIEW\n'), 'prints table headings');
    assert.ok(output.includes(
        '      http://example.com 123:456 - yes - - \n'), 'prints cells');
  });

  it('generates valid html output', () => {
    new ReportGenerator(); // Registers the if_not_eq helper used by the html formatter.

    Handlebars.registerHelper(TableFormatter.getHelpers());

    const formatter = TableFormatter.getFormatter('html');
    const template = Handlebars.compile(formatter);
    const output = template(extendedInfo).split('\n').join('');
    assert.ok(output.match('<table class="table_list'), 'creates a table');
    assert.ok(output.match('multicolumn'), 'adds multicolumn class for large tables');
    assert.ok(output.match('class="preview-image"'), 'renders image preview');

    const extendedInfoShort = {
      tableHeadings: {url: 'URL', lineCol: 'Line/col'},
      results: extendedInfo.results
    };
    const output2 = template(extendedInfoShort).split('\n').join('');
    assert.ok(!output2.match('multicolumn"'), 'does not add multicolumn class for small tables');
    assert.ok(!output2.match('class="preview-image'),
                             'does not add preview-image class if table does not have images');
  });

  it('handles missing values', () => {
    const pretty = TableFormatter.getFormatter('pretty');
    assert.equal(pretty({
      tableHeadings: {name: 'Name', value: 'Value'},
      results: [
        {name: 'thing1', value: 'foo'},
        {name: 'thing2'},
        {value: 'bar'},
      ]
    }), [
      '      NAME VALUE\n',
      '      thing1 foo \n',
      '      thing2 -- \n',
      '      -- bar \n',
    ].join(''));
  });

  it('handles non-string values', () => {
    const pretty = TableFormatter.getFormatter('pretty');
    assert.equal(pretty({
      tableHeadings: {name: 'Name', value: 'Value'},
      results: [
        {name: 'thing1', value: 5},
        {name: 'thing2', value: false},
      ]
    }), [
      '      NAME VALUE\n',
      '      thing1 5 \n',
      '      thing2 false \n',
    ].join(''));
  });
});
