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

const TEMPLATE_FILE = fs.readFileSync(__dirname + '/../../../../report/v2/templates.html', 'utf8');

/* eslint-env mocha */

describe('DOM', () => {
  let dom;

  before(() => {
    global.URL = URL;
    const document = jsdom.jsdom(TEMPLATE_FILE);
    dom = new DOM(document);
  });

  after(() => {
    global.URL = undefined;
  });

  describe('createElement', () => {
    it('creates a simple element using default values', () => {
      const el = dom.createElement('div');
      assert.equal(el.localName, 'div');
      assert.equal(el.className, '');
      assert.equal(el.className, el.attributes.length);
    });

    it('creates an element from parameters', () => {
      const el = dom.createElement(
          'div', 'class1 class2', {title: 'title attr', tabindex: 0});
      assert.equal(el.localName, 'div');
      assert.equal(el.className, 'class1 class2');
      assert.equal(el.getAttribute('title'), 'title attr');
      assert.equal(el.getAttribute('tabindex'), '0');
    });
  });

  describe('cloneTemplate', () => {
    it('should clone a template', () => {
      const clone = dom.cloneTemplate('#tmpl-lh-audit-score');
      assert.ok(clone.querySelector('.lh-score'));
    });

    it('fails when template cannot be found', () => {
      assert.throws(() => dom.cloneTemplate('#unknown-selector'));
    });
  });

  describe('createSpanFromMarkdown', () => {
    it('correctly converts links', () => {
      let result = dom.createSpanFromMarkdown(
          'Some [link](https://example.com/foo). [Learn more](http://example.com).');
      assert.equal(result.innerHTML,
          'Some <a rel="noopener" target="_blank" href="https://example.com/foo">link</a>. ' +
          '<a rel="noopener" target="_blank" href="http://example.com/">Learn more</a>.');

      result = dom.createSpanFromMarkdown('[link](https://example.com/foo)');
      assert.equal(result.innerHTML,
          '<a rel="noopener" target="_blank" href="https://example.com/foo">link</a>',
          'just a link');

      result = dom.createSpanFromMarkdown(
          '[ Link ](https://example.com/foo) and some text afterwards.');
      assert.equal(result.innerHTML,
          '<a rel="noopener" target="_blank" href="https://example.com/foo"> Link </a> ' +
          'and some text afterwards.', 'link with spaces in brackets');
    });

    it('handles invalid urls', () => {
      const text = 'Text has [bad](https:///) link.';
      assert.throws(() => {
        dom.createSpanFromMarkdown(text);
      });
    });

    it('ignores links that do not start with http', () => {
      const text = 'Sentence with [link](/local/path).';
      const result = dom.createSpanFromMarkdown(text);
      assert.equal(result.innerHTML, text);
    });
  });
});
