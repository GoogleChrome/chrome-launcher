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

/* eslint-env mocha */

const criticalRequestChainFormatter = require('../../formatters/critical-request-chains.js');
const assert = require('assert');
const Handlebars = require('handlebars');
const log = require('../../lib/log');
const handlebarHelpers = require('../../report/handlebar-helpers');

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

describe('CRC Formatter', () => {
  after(() => {
    Object.keys(handlebarHelpers).forEach(Handlebars.unregisterHelper, Handlebars);
  });

  it('copes with invalid input', () => {
    const formatter = criticalRequestChainFormatter.getFormatter('pretty');
    assert.doesNotThrow(_ => {
      formatter();
      formatter(null);
    });
  });

  it('generates valid pretty output', () => {
    const formatter = criticalRequestChainFormatter.getFormatter('pretty');
    const output = formatter(extendedInfo);
    const truncatedURL = criticalRequestChainFormatter.parseURL(superLongName);
    const truncatedURLRegExp = new RegExp(truncatedURL.file, 'im');
    const testString = new RegExp(log.heavyUpAndRight +
                                  log.heavyHorizontal +
                                  log.heavyDownAndHorizontal +
                                  ' \\/ \\(example.com\\)', 'im');
    assert.ok(testString.test(output));
    const testString2 = new RegExp(log.heavyVerticalAndRight +
                                   log.heavyHorizontal +
                                   log.heavyHorizontal +
                                   ' \\/b.js \\(example.com\\) - 5,000ms', 'im');
    assert.ok(output.includes('6,123.5ms'), 'Millisecond values are not formatted as expected');
    assert.ok(testString2.test(output));
    assert.ok(truncatedURLRegExp.test(output));
    assert.ok(/about:blank/.test(output));
  });

  it('generates valid HTML output', () => {
    Handlebars.registerHelper(handlebarHelpers);
    const formatter = criticalRequestChainFormatter.getFormatter('html');
    const template = Handlebars.compile(formatter);
    const output = template(extendedInfo).split('\n').join('');
    const truncatedURL = criticalRequestChainFormatter.parseURL(superLongName);
    const truncatedURLRegExp = new RegExp(truncatedURL.file, 'im');
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
    assert.ok(truncatedURLRegExp.test(output));
  });
});
