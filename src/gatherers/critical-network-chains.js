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

const Gather = require('./gather');
const log = require('../lib/log.js');

/**
 * @param {!Array<Array<T>>} arr
 * @return {!Array<T>}
 */
const flatten = arr => arr.reduce((a, b) => a.concat(b), []);

const includes = (arr, elm) => arr.indexOf(elm) > -1;

class RequestNode {
  /** @return string */
  get requestId() {
    return this.request.requestId;
  }

  /**
   * @param {!NetworkRequest} request
   * @param {RequestNode} parent
   */
  constructor(request, parent) {
    // The children of a RequestNode are the requests initiated by it
    this.children = [];
    // The parent of a RequestNode is the request that initiated it
    this.parent = parent;

    this.request = request;
  }

  setParent(parentNode) {
    this.parent = parentNode;
  }

  addChild(childNode) {
    this.children.push(childNode);
  }

  toJSON() {
    // Prevents circular reference so we can print nodes when needed
    return `{
      id: ${this.requestId},
      parent: ${this.parent ? this.parent.requestId : null},
      children: ${JSON.stringify(this.children.map(child => child.requestId))}
    }`;
  }

}

class CriticalNetworkChains extends Gather {
  get name() {
    return 'criticalNetworkChains';
  }

  /**
   * A sequential chain of RequestNodes
   * @typedef {!Array<RequestNode>} RequestNodeChain
   */

  /**
   * A sequential chain of WebInspector.NetworkRequest
   * @typedef {!Array<NetworkRequest>} NetworkRequestChain
   */

  /** @return {String} */
  get criticalPriorities() {
    // For now, critical request == render blocking request (as decided by
    // blink). Blink treats requests with the following priority levels as
    // render blocking.
    // See https://docs.google.com/document/d/1bCDuq9H1ih9iNjgzyAL0gpwNFiEP4TZS-YLRp_RuMlc
    return ['VeryHigh', 'High', 'Medium'];
  }

  /**
   * @param {!Array<NetworkRequest>} networkRecords
   * @return {!Array<NetworkRequestChain>}
  */
  getCriticalChains(networkRecords) {
    // Drop the first request because it's uninteresting - it's the page html
    // and always critical. No point including it in every request
    /** @type {!Array<NetworkRequest>} */
    const criticalRequests = networkRecords.slice(1).filter(
      req => includes(this.criticalPriorities, req.initialPriority()));

    // Build a map of requestID -> Node.
    /** @type {!Map<string, RequestNode} */
    const requestIdToNodes = new Map();
    for (let request of criticalRequests) {
      /** @type {RequestNode} */
      const requestNode = new RequestNode(request, null);
      requestIdToNodes.set(requestNode.requestId, requestNode);
    }

    // Connect the parents and children
    for (let request of criticalRequests) {
      if (request.initiatorRequest()) {
        /** @type {!string} */
        const parentRequestId = request.initiatorRequest().requestId;
        /** @type {?RequestNode} */
        const childNode = requestIdToNodes.get(request.requestId);
        /** @type {?RequestNode} */
        const parentNode = requestIdToNodes.get(parentRequestId);
        if (childNode && parentNode) {
          // Both child and parent must be critical
          // TODO: We may need handle redirects carefully. Investigate
          childNode.setParent(parentNode);
          parentNode.addChild(childNode);
        }
      }
    }

    /** @type {!Array<RequestNode>} */
    const nodesList = [...requestIdToNodes.values()];
    /** @type {!Array<RequestNode>} */
    const orphanNodes = nodesList.filter(node => node.parent === null);
    /** @type {!Array<Array<RequestNodeChain>>} */
    const orphanNodeChains = orphanNodes.map(node => this._getChainsDFS(node));
    /** @type {!Array<RequestNodeChain>} */
    const nodeChains = flatten(orphanNodeChains);
    /** @type {!Array<NetworkRequestChain>} */
    const requestChains = nodeChains.map(chain => chain.map(
      node => node.request));
    return requestChains;
  }

  postProfiling(options, tracingData) {
    const chains = this.getCriticalChains(tracingData.networkRecords);

    if (options.flags.useNetDepGraph) {
      // There logs are here so we can test this gatherer
      // Will be removed when we have a way to surface them in the report
      const nonTrivialChains = chains.filter(chain => chain.length > 1);

      // Note: Approximately,
      // startTime: time when request was dispatched
      // responseReceivedTime: either time to first byte, or time of receiving
      //  the end of response headers
      // endTime: time when response loading finished
      const debuggingData = nonTrivialChains.map(chain => ({
        urls: chain.map(request => request._url),
        totalRequests: chain.length,
        times: chain.map(request => ({
          startTime: request.startTime,
          endTime: request.endTime,
          responseReceivedTime: request.responseReceivedTime
        })),
        totalTimeBetweenBeginAndEnd:
          (chain[chain.length - 1].endTime - chain[0].startTime) * 1000,
        totalLoadingTime: (chain.reduce((acc, req) =>
          acc + (req.endTime - req.responseReceivedTime), 0)) * 1000
      })).sort((a, b) =>
        b.totalTimeBetweenBeginAndEnd - a.totalTimeBetweenBeginAndEnd);
      log.log('info', 'cricital chains', JSON.stringify(debuggingData));
      log.log('info', 'lengths of critical chains', debuggingData.map(d => d.totalRequests));
    }

    this.artifact = chains;
  }

  /**
   * @param {!RequestNode} startNode
   * @return {!Array<RequestNodeChain>}
   */
  _getChainsDFS(startNode) {
    if (startNode.children.length === 0) {
      return [[startNode]];
    }

    const childrenChains = flatten(startNode.children.map(child =>
      this._getChainsDFS(child)));
    return childrenChains.map(chain => [startNode].concat(chain));
  }
}

module.exports = CriticalNetworkChains;
