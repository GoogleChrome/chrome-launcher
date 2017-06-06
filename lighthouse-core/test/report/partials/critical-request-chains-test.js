/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const assert = require('assert');
const Handlebars = require('handlebars');
const URL = require('../../../lib/url-shim');
const handlebarHelpers = require('../../../report/handlebar-helpers');
const fs = require('fs');
const partialHtml = fs.readFileSync(__dirname +
    '/../../../report/partials/critical-request-chains.html', 'utf8');

const superLongName =
    'https://example.com/thisIsASuperLongURLThatWillTriggerFilenameTruncationWhichWeWantToTest.js';
const extendedInfo = {
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
            url: superLongName,
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

describe('CRC partial generation', () => {
  after(() => {
    Object.keys(handlebarHelpers).forEach(Handlebars.unregisterHelper, Handlebars);
  });

  it('generates valid HTML output', () => {
    Handlebars.registerHelper(handlebarHelpers);
    const template = Handlebars.compile(partialHtml);
    const output = template(extendedInfo).split('\n').join('');
    const filename = URL.getURLDisplayName(superLongName);
    const filenameRegExp = new RegExp(filename, 'im');
    const expectedTreeOne = new RegExp([
      '<div class="cnc-node" title="https://example.com/">',
      '<span class="cnc-node__tree-marker">',
      '<span class="tree-marker up-right"></span>',
      '<span class="tree-marker right"></span>',
      '<span class="tree-marker horiz-down"></span>',
      '</span>',
      '<span class="cnc-node__tree-value">',
      '<span class="cnc-node__tree-file">/</span>',
      '<span class="cnc-node__tree-hostname">\\(example.com\\)</span>',
      '</span>'
    ].join('\\s*'), 'im');

    assert.ok(expectedTreeOne.test(output));

    const expectedTreeTwo = new RegExp([
      '<div class="cnc-node" title="https://example.com/b.js">',
      '<span class="cnc-node__tree-marker">',
      '<span class="tree-marker space"></span>',
      '<span class="tree-marker space"></span>',
      '<span class="tree-marker vert-right"></span>',
      '<span class="tree-marker right"></span>',
      '<span class="tree-marker right"></span>',
      '</span>',
      '<span class="cnc-node__tree-value">',
      '<span class="cnc-node__tree-file">/b.js</span>',
      '<span class="cnc-node__tree-hostname">\\(example.com\\)</span>',
      '- <span class="cnc-node__chain-duration">16,000ms</span>,',
      '<span class="cnc-node__chain-duration">0KB</span>',
      '</span>'
    ].join('\\s*'), 'im');

    assert.ok(expectedTreeTwo.test(output), output);

    const expectedTreeThree = new RegExp(`<div class="cnc-node" title="${superLongName}">`);

    assert.ok(expectedTreeThree.test(output));
    assert.ok(filenameRegExp.test(output));
  });
});
