/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const jsdom = require('jsdom');
const URL = require('../../../../lib/url-shim');
const DOM = require('../../../../report/v2/renderer/dom.js');
const Util = require('../../../../report/v2/renderer/util.js');
const DetailsRenderer = require('../../../../report/v2/renderer/details-renderer.js');

const TEMPLATE_FILE = fs.readFileSync(__dirname + '/../../../../report/v2/templates.html', 'utf8');

/* eslint-env mocha */

describe('DetailsRenderer', () => {
  let renderer;

  before(() => {
    global.URL = URL;
    global.Util = Util;
    const document = jsdom.jsdom(TEMPLATE_FILE);
    const dom = new DOM(document);
    renderer = new DetailsRenderer(dom);
  });

  after(() => {
    global.URL = undefined;
    global.Util = undefined;
  });

  describe('render', () => {
    it('renders text', () => {
      const el = renderer.render({type: 'text', text: 'My text content'});
      assert.equal(el.textContent, 'My text content');
      assert.ok(el.classList.contains('lh-text'), 'adds classes');
    });

    it('renders lists with headers', () => {
      const el = renderer.render({
        type: 'list',
        header: {type: 'text', text: 'My Header'},
        items: [
          {type: 'text', text: 'content 1'},
          {type: 'text', text: 'content 2'},
        ],
      });

      const header = el.querySelector('.lh-list__header');
      assert.equal(header.textContent, 'My Header', 'did not render header');

      const items = el.querySelector('.lh-list__items');
      assert.equal(items.children.length, 2, 'did not render children');
    });

    it('renders lists without headers', () => {
      const el = renderer.render({
        type: 'list',
        items: [
          {type: 'text', text: 'content 1'},
          {type: 'text', text: 'content 2'},
          {type: 'text', text: 'content 3'},
        ],
      });

      const header = el.querySelector('.lh-list__header');
      assert.ok(!header, 'rendered header');

      const items = el.querySelector('.lh-list__items');
      assert.equal(items.children.length, 3, 'did not render children');
    });

    it('renders cards', () => {
      const list = {
        header: {type: 'text', text: 'View details'},
        items: [
          {title: 'Total DOM Nodes', value: 3500, target: '1,500 nodes'},
          {title: 'DOM Depth', value: 10, snippet: 'snippet'},
          {title: 'Maximum Children', value: 20, snippet: 'snippet2', target: 20}
        ]
      };

      const details = renderer._renderCards(list);
      assert.ok(details.classList.contains('lh-details'));
      assert.equal(details.querySelector('summary').textContent, 'View details');

      const cards = details.querySelectorAll('.lh-scorecards > .lh-scorecard');
      assert.ok(cards.length, list.items.length, `renders ${list.items.length} cards`);
      assert.equal(cards[0].hasAttribute('title'), false,
          'does not add title attr if snippet is missing');
      assert.equal(cards[0].querySelector('.lh-scorecard__title').textContent,
          'Total DOM Nodes', 'fills title');
      assert.equal(cards[0].querySelector('.lh-scorecard__value').textContent,
          '3500', 'fills value');
      assert.equal(cards[0].querySelector('.lh-scorecard__target').textContent,
          'target: 1,500 nodes', 'fills target');
      assert.equal(cards[1].getAttribute('title'), 'snippet', 'adds title attribute for snippet');
      assert.ok(!cards[1].querySelector('.lh-scorecard__target'), 'handles missing target');
    });

    it('renders code', () => {
      const el = renderer.render({
        type: 'code',
        text: 'code snippet',
        lineNumber: 123,
        source: 'deprecation',
        url: 'https://example.com/feature'
      });

      assert.ok(el.localName === 'pre');
      assert.ok(el.classList.contains('lh-code'));
      assert.equal(el.textContent, 'code snippet');
    });

    it('renders thumbnails', () => {
      const el = renderer.render({
        type: 'thumbnail',
        url: 'http://example.com/my-image.jpg',
        mimeType: 'image/jpeg',
      });

      assert.ok(el.localName === 'img');
      assert.ok(el.classList.contains('lh-thumbnail'));
      assert.equal(el.src, 'http://example.com/my-image.jpg');
    });

    it('renders filmstrips', () => {
      const el = renderer.render({
        type: 'filmstrip',
        items: [
          {timing: 1020, data: 'foobar'},
          {timing: 3030, data: 'foobaz'},
        ],
      });

      assert.ok(el.localName === 'div');
      assert.ok(el.classList.contains('lh-filmstrip'));

      const frames = [...el.querySelectorAll('.lh-filmstrip__frame')];
      assert.equal(frames.length, 2);
      assert.equal(frames[0].textContent, '1 s');
      assert.equal(frames[1].textContent, '3 s');

      const thumbnails = [...el.querySelectorAll('.lh-filmstrip__thumbnail')];
      assert.equal(thumbnails.length, 2);
      assert.equal(thumbnails[0].src, 'data:image/jpeg;base64,foobar');
      assert.ok(thumbnails[0].alt, 'did not set alt text');
    });

    it('renders tables', () => {
      const el = renderer.render({
        type: 'table',
        header: 'View Items',
        itemHeaders: [
          {type: 'text', text: 'First'},
          {type: 'text', text: 'Second'},
          {type: 'text', text: 'Preview', itemType: 'thumbnail'},
        ],
        items: [
          [
            {type: 'text', text: 'value A.1'},
            {type: 'text', text: 'value A.2'},
            {type: 'thumbnail', url: 'http://example.com/image.jpg', mimeType: 'image/jpeg'},
          ],
          [
            {type: 'text', text: 'value B.1'},
            {type: 'text', text: 'value B.2'},
            {type: 'thumbnail', url: 'unknown'},
          ],
        ],
      });

      assert.equal(el.localName, 'details');
      assert.ok(el.querySelector('table'), 'did not render table');
      assert.ok(el.querySelector('img'), 'did not render recursive items');
      assert.equal(el.querySelectorAll('th').length, 3, 'did not render header items');
      assert.equal(el.querySelectorAll('td').length, 6, 'did not render table cells');
      assert.equal(el.querySelectorAll('.lh-table-column--text').length, 6, '--text not set');
      assert.equal(el.querySelectorAll('.lh-table-column--thumbnail').length, 3,
          '--thumbnail not set');
    });
  });
});
