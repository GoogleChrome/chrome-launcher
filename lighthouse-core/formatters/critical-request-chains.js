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

          const longestChain = CriticalRequestChains._getLongestChain(info).length;
          const longestDuration = CriticalRequestChains.formatNumber(
              CriticalRequestChains._getLongestChain(info).duration);
          const longestTransferSize = CriticalRequestChains.formatTransferSize(
              CriticalRequestChains._getLongestChain(info).transferSize);
          const urlTree = CriticalRequestChains._createURLTreeOutput(info);

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

  static _traverse(tree, cb) {
    function walk(node, depth, startTime, transferSize = 0) {
      const children = Object.keys(node);
      if (children.length === 0) {
        return;
      }
      children.forEach(id => {
        const child = node[id];
        if (!startTime) {
          startTime = child.request.startTime;
        }

        // Call the callback with the info for this child.
        cb({
          depth,
          id,
          node: child,
          chainDuration: (child.request.endTime - startTime) * 1000,
          chainTransferSize: (transferSize + child.request.transferSize)
        });

        // Carry on walking.
        walk(child.children, depth + 1, startTime);
      }, '');
    }

    walk(tree, 0);
  }

  /**
   * Get stats about the longest initiator chain (as determined by time duration)
   * @return {{duration: number, length: number, transferSize: number}}
   */
  static _getLongestChain(tree) {
    const longest = {
      duration: 0,
      length: 0,
      transferSize: 0
    };
    this._traverse(tree, opts => {
      const duration = opts.chainDuration;
      if (duration > longest.duration) {
        longest.duration = duration;
        longest.transferSize = opts.chainTransferSize;
        longest.length = opts.depth;
      }
    });
    // Always return the longest chain + 1 because the depth is zero indexed.
    longest.length++;
    return longest;
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

  static parseURL(resourceURL, opts) {
    const parsedURL = {
      file: URL.getDisplayName(resourceURL),
      hostname: new URL(resourceURL).hostname
    };

    // If we get passed the opts parameter, this is Handlebars, so we
    // need to return the object back via the opts.fn so it becomes the context.
    if (opts) {
      return opts.fn(parsedURL);
    }

    return parsedURL;
  }

  static getHelpers() {
    return {
      longestChain(info) {
        return CriticalRequestChains._getLongestChain(info).length;
      },

      longestDuration(info) {
        return CriticalRequestChains._getLongestChain(info).duration;
      },

      longestChainTransferSize(info) {
        return CriticalRequestChains._getLongestChain(info).transferSize;
      },

      chainDuration(startTime, endTime) {
        return CriticalRequestChains.formatNumber((endTime - startTime) * 1000);
      },

      formatTransferSize: CriticalRequestChains.formatTransferSize,

      parseURL: CriticalRequestChains.parseURL,

      formatNumber: CriticalRequestChains.formatNumber,

      /**
       * Helper function for Handlebars that creates the context for each node
       * based on its parent. Calculates if this node is the last child, whether
       * it has any children itself and what the tree looks like all the way back
       * up to the root, so the tree markers can be drawn correctly.
       */
      createContextFor(parent, id, treeMarkers, parentIsLastChild, startTime, transferSize, opts) {
        const node = parent[id];
        const siblings = Object.keys(parent);
        const isLastChild = siblings.indexOf(id) === (siblings.length - 1);
        const hasChildren = Object.keys(node.children).length > 0;

        // Copy the tree markers so that we don't change by reference.
        const newTreeMarkers = Array.isArray(treeMarkers) ? treeMarkers.slice(0) : [];

        // Add on the new entry.
        if (typeof parentIsLastChild !== 'undefined') {
          newTreeMarkers.push(!parentIsLastChild);
        }

        return opts.fn({
          node,
          isLastChild,
          hasChildren,
          startTime,
          transferSize: (transferSize + node.request.transferSize),
          treeMarkers: newTreeMarkers
        });
      },

      createTreeRenderContext(tree, opts) {
        const transferSize = 0;
        let startTime = 0;
        const rootNodes = Object.keys(tree);

        if (rootNodes.length > 0) {
          startTime = tree[rootNodes[0]].request.startTime;
        }

        return opts.fn({
          tree,
          startTime,
          transferSize
        });
      }
    };
  }
}

module.exports = CriticalRequestChains;
