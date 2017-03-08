/**
 * @license
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

const URL = require('../lib/url-shim');
const path = require('path');
const fs = require('fs');
const Formatter = require('./formatter');
const html = fs.readFileSync(path.join(__dirname, 'partials/critical-request-chains.html'), 'utf8');
const log = require('../lib/log');

const heavyUpAndRightLong = log.heavyUpAndRight + log.heavyHorizontal;
const heavyVerticalAndRightLong = log.heavyVerticalAndRight + log.heavyHorizontal;

class CriticalRequestChains extends Formatter {

  /**
   * gets the formatter for the CLI Printer and the HTML report.
   */
  static getFormatter(type) {
    switch (type) {
      case 'pretty':
        return function(info) {
          if (info === null ||
              typeof info === 'undefined') {
            return '';
          }

          const longestChain = info.longestChain.length;
          const longestDuration = CriticalRequestChains.formatNumber(
              info.longestChain.duration);
          const longestTransferSize = CriticalRequestChains.formatTransferSize(
              info.longestChain.transferSize);
          const urlTree = CriticalRequestChains._createURLTreeOutput(info.chains);

          const output = `    - Longest request chain: ${longestDuration}ms` +
          ` over ${longestChain} requests, totalling ${longestTransferSize}KB\n` +
          '    - Initial navigation\n' +
              '      ' + urlTree.replace(/\n/g, '\n      ') + '\n';
          return output;
        };

      case 'html':
        // Returns a handlebars string to be used by the Report.
        return html;

      default:
        throw new Error('Unknown formatter type');
    }
  }

  /**
   * Converts the tree into an ASCII tree.
   */
  static _createURLTreeOutput(tree) {
    function write(opts) {
      const node = opts.node;
      const depth = opts.depth;
      const treeMarkers = opts.treeMarkers;
      let startTime = opts.startTime;
      const transferSize = opts.transferSize;

      return Object.keys(node).reduce((output, id, currentIndex, arr) => {
        // Test if this node has children, and if it's the last child.
        const hasChildren = (Object.keys(node[id].children).length > 0);
        const isLastChild = (currentIndex === arr.length - 1);

        // If the parent is the last child then don't drop the vertical bar.
        const ancestorTreeMarker = treeMarkers.reduce((markers, marker) => {
          return markers + (marker ? log.heavyVertical : '  ');
        }, '');

        // Copy the tree markers so that we don't change by reference.
        const newTreeMakers = treeMarkers.slice(0);

        // Add on the new entry.
        newTreeMakers.push(!isLastChild);

        // Create the appropriate tree marker based on the depth of this
        // node as well as whether or not it has children and is itself the last child.
        const treeMarker = ancestorTreeMarker +
            (isLastChild ? heavyUpAndRightLong : heavyVerticalAndRightLong) +
            (hasChildren ? log.heavyDownAndHorizontal : log.heavyHorizontal);

        const parsedURL = CriticalRequestChains.parseURL(node[id].request.url);

        if (!startTime) {
          startTime = node[id].request.startTime;
        }

        const duration = CriticalRequestChains.formatNumber(
            (node[id].request.endTime - startTime) * 1000);
        const chainTransferSize = transferSize + node[id].request.transferSize;
        const formattedTransferSize = CriticalRequestChains.formatTransferSize(chainTransferSize);

        // Return the previous output plus this new node, and recursively write its children.
        return output + `${treeMarker} ${parsedURL.file} (${parsedURL.hostname})` +
            // If this node has children, write them out. Othewise write the chain time.
            (hasChildren ? '' : ` - ${duration}ms, ${formattedTransferSize}KB`) + '\n' +
            write({
              node: node[id].children,
              depth: depth + 1,
              treeMarkers: newTreeMakers,
              startTime,
              transferSize: chainTransferSize
            });
      }, '');
    }

    return write({
      node: tree,
      depth: 0,
      treeMarkers: [],
      startTime: 0,
      transferSize: 0
    });
  }

  static formatNumber(num) {
    return num.toLocaleString(undefined, {maximumFractionDigits: 1});
  }

  static formatTransferSize(size) {
    return (size / 1024).toLocaleString(undefined, {maximumFractionDigits: 2});
  }

  static parseURL(resourceURL) {
    const parsedURL = {
      file: URL.getDisplayName(resourceURL),
      hostname: new URL(resourceURL).hostname
    };

    return parsedURL;
  }
}

module.exports = CriticalRequestChains;
