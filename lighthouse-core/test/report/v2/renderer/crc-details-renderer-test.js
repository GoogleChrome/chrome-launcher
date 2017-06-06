/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const assert = require('assert');
const fs = require('fs');
const jsdom = require('jsdom');
const URL = require('../../../../lib/url-shim');
const Util = require('../../../../report/v2/renderer/util.js');
const DOM = require('../../../../report/v2/renderer/dom.js');
const CriticalRequestChainRenderer =
    require('../../../../report/v2/renderer/crc-details-renderer.js');

const TEMPLATE_FILE = fs.readFileSync(__dirname + '/../../../../report/v2/templates.html', 'utf8');

const superLongURL =
    'https://example.com/thisIsASuperLongURLThatWillTriggerFilenameTruncationWhichWeWantToTest.js';
const DETAILS = {
  type: 'criticalrequestchain',
  header: {type: 'text', text: 'CRC Header'},
  chains: {
    0: {
      request: {
        endTime: 1,
        responseReceivedTime: 5,
        startTime: 0,
        url: 'https://example.com/',
        transferSize: 1
      },
      children: {
        1: {
          request: {
            endTime: 16,
            responseReceivedTime: 14,
            startTime: 11,
            url: 'https://example.com/b.js',
            transferSize: 1
          },
          children: {}
        },
        2: {
          request: {
            endTime: 17.123456789,
            responseReceivedTime: 15,
            startTime: 12,
            url: superLongURL,
            transferSize: 1
          },
          children: {}
        },
        3: {
          request: {
            endTime: 18,
            responseReceivedTime: 16,
            startTime: 13,
            url: 'about:blank',
            transferSize: 1
          },
          children: {}
        }
      }
    }
  },
  longestChain: {
    duration: 7000,
    length: 2,
    transferSize: 1
  }
};

describe('DetailsRenderer', () => {
  let dom;

  before(() => {
    global.URL = URL;
    global.Util = Util;
    const document = jsdom.jsdom(TEMPLATE_FILE);
    dom = new DOM(document);
  });

  after(() => {
    global.URL = undefined;
    global.Util = undefined;
  });

  it('renders tree structure', () => {
    const el = CriticalRequestChainRenderer.render(dom, dom.document(), DETAILS);
    const details = el.querySelector('.lh-details');
    const chains = details.querySelectorAll('.crc-node');
    assert.equal(chains.length, 4, 'generates correct number of chain nodes');

    const div = dom.createElement('div');
    div.innerHTML = `<span class="crc-node__tree-marker">
        <!-- fill me -->
        <span class="tree-marker up-right"></span>
        <span class="tree-marker right"></span>
        <span class="tree-marker horiz-down"></span>
      </span>
      <span class="crc-node__tree-value">
        <span class="crc-node__tree-file">/</span>
        <span class="crc-node__tree-hostname">(example.com)</span>
        <!-- fill me -->
      </span>`;
    assert.ok(chains[0].innerHTML, div.innerHTML);

    div.innerHTML = `<span class="crc-node__tree-marker">
        <!-- fill me -->
        <span class="tree-marker"></span>
        <span class="tree-marker"></span>
        <span class="tree-marker vert-right"></span>
        <span class="tree-marker right"></span>
        <span class="tree-marker right"></span>
      </span>
      <span class="crc-node__tree-value">
        <span class="crc-node__tree-file">/b.js</span>
        <span class="crc-node__tree-hostname">(example.com)</span>
        <!-- fill me -->
        <span class="crc-node__chain-duration"> - 5,000ms, </span>
        <span class="crc-node__chain-duration">0KB</span>
      </span>`;
    assert.ok(chains[1].innerHTML, div.innerHTML);
  });
});
