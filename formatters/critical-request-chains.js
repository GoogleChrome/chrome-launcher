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

const url = require('url');
const path = require('path');
const fs = require('fs');
const Formatter = require('./formatter');
const html = fs.readFileSync(path.join(__dirname, 'partials/critical-request-chains.html'), 'utf8');

class CriticalRequestChains extends Formatter {

  /**
   * gets the formatter for the CLI Printer and the HTML report.
   */
  static getFormatter(type) {
    switch (type) {
      case 'pretty':
        return function(info) {
          const longestChain = CriticalRequestChains._getLongestChainLength(info);
          const longestDuration = CriticalRequestChains._getLongestChainDuration(info);
          const urlTree = CriticalRequestChains._createURLTreeOutput(info);

          const output = `    - Longest request chain (shorter is better): ${longestChain}\n` +
          `    - Longest chain duration (shorter is better): ${longestDuration.toFixed(2)}ms\n` +
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
    function walk(node, depth, startTime) {
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
          chainDuration: (child.request.endTime - startTime) * 1000
        });

        // Carry on walking.
        walk(child.children, depth + 1, startTime);
      }, '');
    }

    walk(tree, 0);
  }

  static _getLongestChainLength(tree) {
    let longestChain = 0;
    this._traverse(tree, opts => {
      const depth = opts.depth;
      if (depth > longestChain) {
        longestChain = depth;
      }
    });

    // Always return the longest chain + 1 because the depth is zero indexed.
    return (longestChain + 1);
  }

  static _getLongestChainDuration(tree) {
    let longestChainDuration = 0;
    this._traverse(tree, opts => {
      const duration = opts.chainDuration;
      if (duration > longestChainDuration) {
        longestChainDuration = duration;
      }
    });
    return longestChainDuration;
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

      return Object.keys(node).reduce((output, id, currentIndex, arr) => {
        // Test if this node has children, and if it's the last child.
        const hasChildren = (Object.keys(node[id].children).length > 0);
        const isLastChild = (currentIndex === arr.length - 1);

        // If the parent is the last child then don't drop the vertical bar.
        const ancestorTreeMarker = treeMarkers.reduce((markers, marker) => {
          return markers + (marker ? '┃ ' : '  ');
        }, '');

        // Copy the tree markers so that we don't change by reference.
        const newTreeMakers = treeMarkers.slice(0);

        // Add on the new entry.
        newTreeMakers.push(!isLastChild);

        // Create the appropriate tree marker based on the depth of this
        // node as well as whether or not it has children and is itself the last child.
        const treeMarker = ancestorTreeMarker +
            (isLastChild ? '┗━' : '┣━') +
            (hasChildren ? '┳' : '━');

        const parsedURL = CriticalRequestChains.parseURL(node[id].request.url);

        if (!startTime) {
          startTime = node[id].request.startTime;
        }

        const duration = ((node[id].request.endTime - startTime) * 1000).toFixed(2);

        // Return the previous output plus this new node, and recursively write its children.
        return output + `${treeMarker} ${parsedURL.file} (${parsedURL.hostname})` +
            // If this node has children, write them out. Othewise write the chain time.
            (hasChildren ? '' : ` - ${duration}ms`) + '\n' +
            write({
              node: node[id].children,
              depth: depth + 1,
              treeMarkers: newTreeMakers,
              startTime
            });
      }, '');
    }

    return write({
      node: tree,
      depth: 0,
      treeMarkers: [],
      startTime: 0
    });
  }

  static formatTime(time) {
    return time.toFixed(2);
  }

  static parseURL(resourceURL, opts) {
    const MAX_FILENAME_LENGTH = 64;
    const parsedResourceURL = url.parse(resourceURL);
    const hostname = parsedResourceURL.hostname;
    let file = parsedResourceURL.path
        // Remove any query strings.
        .replace(/\?.*/, '')
        // Grab the last two parts of the path.
        .split('/').slice(-2).join('/');
    if (file.length > MAX_FILENAME_LENGTH) {
      file = file.slice(0, MAX_FILENAME_LENGTH) + '...';
    }

    const parsedURL = {
      file,
      hostname
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
        return CriticalRequestChains._getLongestChainLength(info);
      },

      longestDuration(info) {
        return CriticalRequestChains._getLongestChainDuration(info);
      },

      chainDuration(startTime, endTime) {
        return ((endTime - startTime) * 1000).toFixed(2);
      },

      parseURL: CriticalRequestChains.parseURL,

      formatTime: CriticalRequestChains.formatTime,

      /**
       * Helper function for Handlebars that creates the context for each node
       * based on its parent. Calculates if this node is the last child, whether
       * it has any children itself and what the tree looks like all the way back
       * up to the root, so the tree markers can be drawn correctly.
       */
      createContextFor(parent, id, treeMarkers, parentIsLastChild, startTime, opts) {
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

        if (!startTime) {
          startTime = node.request.startTime;
        }

        return opts.fn({
          node,
          isLastChild,
          hasChildren,
          startTime,
          treeMarkers: newTreeMarkers
        });
      }
    };
  }
}

module.exports = CriticalRequestChains;
