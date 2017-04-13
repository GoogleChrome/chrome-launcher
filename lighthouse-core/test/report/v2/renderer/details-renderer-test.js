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

const assert = require('assert');
const fs = require('fs');
const jsdom = require('jsdom');
const URL = require('../../../../lib/url-shim');
const DOM = require('../../../../report/v2/renderer/dom.js');
const DetailsRenderer = require('../../../../report/v2/renderer/details-renderer.js');

const TEMPLATE_FILE = fs.readFileSync(__dirname + '/../../../../report/v2/templates.html', 'utf8');

/* eslint-env mocha */

describe('DetailsRenderer', () => {
  let renderer;

  before(() => {
    global.URL = URL;
    const document = jsdom.jsdom(TEMPLATE_FILE);
    const dom = new DOM(document);
    renderer = new DetailsRenderer(dom);
  });

  after(() => {
    global.URL = undefined;
  });

  describe('render', () => {
    it('renders text', () => {
      const el = renderer.render({type: 'text', text: 'My text content'});
      assert.equal(el.textContent, 'My text content');
      assert.ok(el.classList.contains('lighthouse-text'), 'adds classes');
    });

    it('renders blocks', () => {
      const el = renderer.render({
        type: 'block',
        items: [
          {type: 'text', text: 'content 1'},
          {type: 'text', text: 'content 2'},
        ],
      });

      const children = el.querySelectorAll('.lighthouse-text');
      assert.equal(children.length, 2, 'renders children');
      assert.ok(el.classList.contains('lighthouse-block'), 'adds classes');
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

      const header = el.querySelector('.lighthouse-list__header');
      assert.equal(header.textContent, 'My Header', 'did not render header');

      const items = el.querySelector('.lighthouse-list__items');
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

      const header = el.querySelector('.lighthouse-list__header');
      assert.ok(!header, 'rendered header');

      const items = el.querySelector('.lighthouse-list__items');
      assert.equal(items.children.length, 3, 'did not render children');
    });

    it('renders nested structures', () => {
      const el = renderer.render({
        type: 'block',
        items: [
          {type: 'text', text: 'content 1'},
          {type: 'text', text: 'content 2'},
          {
            type: 'list',
            header: {type: 'text', text: 'header'},
            items: [
              {type: 'text', text: 'sub-content 1'},
              {type: 'text', text: 'sub-content 2'},
            ]
          },
        ],
      });

      const textChild = el.querySelector('.lighthouse-block > .lighthouse-text');
      const listChild = el.querySelector('.lighthouse-block > .lighthouse-list');
      const textSubChild = el.querySelector('.lighthouse-block .lighthouse-list .lighthouse-text');
      assert.ok(textChild, 'did not render text children');
      assert.ok(listChild, 'did not render list child');
      assert.ok(textSubChild, 'did not render sub-children');
    });
  });
});
