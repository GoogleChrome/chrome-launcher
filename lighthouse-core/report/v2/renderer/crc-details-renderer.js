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

/**
 * @fileoverview This file contains helpers for constructing and rendering the
 * critical request chains network tree.
 */

/* globals self Util */

class CriticalRequestChainRenderer {

  /**
   * @param {!DOM} dom
   * @param {!Node} templateContext
   */
  constructor(dom, templateContext) {
    /** @private {!DOM} */
    this._dom = dom;
    /** @private {!DocumentFragment} */
    this._tmpl = this._dom.cloneTemplate('#tmpl-lh-crc', templateContext);
    /** @private {!CriticalRequestChainRenderer.CRCDetailsJSON} */
    this._details; // eslint-disable-line no-unused-expressions
  }

  /**
   * Create render context for critical-request-chain tree display.
   * @param {!Object<string, !CriticalRequestChainRenderer.CRCNode>} tree
   * @return {{tree: !Object<string, !CriticalRequestChainRenderer.CRCNode>, startTime: number, transferSize: number}}
   */
  initTree(tree) {
    let startTime = 0;
    const rootNodes = Object.keys(tree);
    if (rootNodes.length > 0) {
      const node = tree[rootNodes[0]];
      startTime = node.request.startTime;
    }

    return {tree, startTime, transferSize: 0};
  }

  /**
   * Helper to create context for each critical-request-chain node based on its
   * parent. Calculates if this node is the last child, whether it has any
   * children itself and what the tree looks like all the way back up to the root,
   * so the tree markers can be drawn correctly.
   * @param {!Object<string, !CriticalRequestChainRenderer.CRCNode>} parent
   * @param {string} id
   * @param {number} startTime
   * @param {number} transferSize
   * @param {!Array<boolean>=} treeMarkers
   * @param {boolean=} parentIsLastChild
   * @return {!CriticalRequestChainRenderer.CRCSegment}
   */
  createSegment(parent, id, startTime, transferSize, treeMarkers, parentIsLastChild) {
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

    return {
      node,
      isLastChild,
      hasChildren,
      startTime,
      transferSize: transferSize + node.request.transferSize,
      treeMarkers: newTreeMarkers
    };
  }

  /**
   * Creates the DOM for a tree segment.
   * @param {!CriticalRequestChainRenderer.CRCSegment} segment
   * @return {!Node}
   */
  createChainNode(segment) {
    const chainsEl = this._dom.cloneTemplate('#tmpl-lh-crc__chains', this._tmpl);

    // Hovering over request shows full URL.
    this._dom.find('.crc-node', chainsEl).setAttribute('title', segment.node.request.url);

    const treeMarkeEl = this._dom.find('.crc-node__tree-marker', chainsEl);

    // Construct lines and add spacers for sub requests.
    segment.treeMarkers.forEach(separator => {
      if (separator) {
        treeMarkeEl.appendChild(this._dom.createElement('span', 'tree-marker vert'));
        treeMarkeEl.appendChild(this._dom.createElement('span', 'tree-marker'));
      } else {
        treeMarkeEl.appendChild(this._dom.createElement('span', 'tree-marker'));
        treeMarkeEl.appendChild(this._dom.createElement('span', 'tree-marker'));
      }
    });

    if (segment.isLastChild) {
      treeMarkeEl.appendChild(this._dom.createElement('span', 'tree-marker up-right'));
      treeMarkeEl.appendChild(this._dom.createElement('span', 'tree-marker right'));
    } else {
      treeMarkeEl.appendChild(this._dom.createElement('span', 'tree-marker vert-right'));
      treeMarkeEl.appendChild(this._dom.createElement('span', 'tree-marker right'));
    }

    if (segment.hasChildren) {
      treeMarkeEl.appendChild(this._dom.createElement('span', 'tree-marker horiz-down'));
    } else {
      treeMarkeEl.appendChild(this._dom.createElement('span', 'tree-marker right'));
    }

    // Fill in url, host, and request size information.
    const {file, hostname} = Util.parseURL(segment.node.request.url);
    const treevalEl = this._dom.find('.crc-node__tree-value', chainsEl);
    this._dom.find('.crc-node__tree-file', treevalEl).textContent = `${file}`;
    this._dom.find('.crc-node__tree-hostname', treevalEl).textContent = `(${hostname})`;

    if (!segment.hasChildren) {
      const span = this._dom.createElement('span', 'crc-node__chain-duration');
      span.textContent = ' - ' + Util.chainDuration(
          segment.node.request.startTime, segment.node.request.endTime) + 'ms, ';
      const span2 = this._dom.createElement('span', 'crc-node__chain-duration');
      span2.textContent = Util.formateBytesToKB(this._details.longestChain.transferSize) + 'KB';

      treevalEl.appendChild(span);
      treevalEl.appendChild(span2);
    }

    return chainsEl;
  }

  /**
   * Recursively builds a tree from segments.
   * @param {!CriticalRequestChainRenderer.CRCSegment} segment
   * @param {!Element} detailsEl Parent details element.
   */
  buildTree(segment, detailsEl) {
    detailsEl.appendChild(this.createChainNode(segment));

    for (const key of Object.keys(segment.node.children)) {
      const childSegment = this.createSegment(segment.node.children, key,
         segment.startTime, segment.transferSize, segment.treeMarkers, segment.isLastChild);
      this.buildTree(childSegment, detailsEl);
    }
  }

  /**
   * @param {!CriticalRequestChainRenderer.CRCDetailsJSON} details
   * @return {!Node}
   */
  render(details) {
    this._details = details;

    // Fill in top summary.
    this._dom.find('.lh-crc__longest_duration', this._tmpl).textContent =
        Util.formatNumber(details.longestChain.duration) + 'ms';
    this._dom.find('.lh-crc__longest_length', this._tmpl).textContent = details.longestChain.length;
    this._dom.find('.lh-crc__longest_transfersize', this._tmpl).textContent =
        Util.formateBytesToKB(details.longestChain.transferSize) + 'KB';

    const detailsEl = this._dom.find('.lh-details', this._tmpl);

    this._dom.find('.lh-details > summary', this._tmpl).textContent = details.header.text;

    // Construct visual tree.
    const root = this.initTree(details.chains);
    for (const key of Object.keys(root.tree)) {
      const segment = this.createSegment(root.tree, key, root.startTime, root.transferSize);
      this.buildTree(segment, detailsEl);
    }

    return this._tmpl;
  }
}

// Allow Node require()'ing.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CriticalRequestChainRenderer;
} else {
  self.CriticalRequestChainRenderer = CriticalRequestChainRenderer;
}

/** @typedef {{
 *     type: string,
 *     header: ({text: string}|undefined),
 *     longestChain: {duration: number, length: number, transferSize: number},
 *     chains: !Object<string, !CriticalRequestChainRenderer.CRCNode>
 * }}
 */
CriticalRequestChainRenderer.CRCDetailsJSON; // eslint-disable-line no-unused-expressions

/** @typedef {{
 *     endTime: number,
 *     responseReceivedTime: number,
 *     startTime: number,
 *     transferSize: number,
 *     url: string
 * }}
 */
CriticalRequestChainRenderer.CRCRequest; // eslint-disable-line no-unused-expressions

/**
 * Record type so children can circularly have CRCNode values.
 * @struct
 * @record
 */
CriticalRequestChainRenderer.CRCNode = function() {};

/** @type {!Object<string, !CriticalRequestChainRenderer.CRCNode>} */
CriticalRequestChainRenderer.CRCNode.prototype.children; // eslint-disable-line no-unused-expressions

/** @type {!CriticalRequestChainRenderer.CRCRequest} */
CriticalRequestChainRenderer.CRCNode.prototype.request; // eslint-disable-line no-unused-expressions

/** @typedef {{
 *     node: !CriticalRequestChainRenderer.CRCNode,
 *     isLastChild: boolean,
 *     hasChildren: boolean,
 *     startTime: number,
 *     transferSize: number,
 *     treeMarkers: !Array<boolean>
 * }}
 */
CriticalRequestChainRenderer.CRCSegment; // eslint-disable-line no-unused-expressions
