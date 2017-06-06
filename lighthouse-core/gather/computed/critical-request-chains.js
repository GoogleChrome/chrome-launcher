/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const WebInspector = require('../../lib/web-inspector');

class CriticalRequestChains extends ComputedArtifact {

  get name() {
    return 'CriticalRequestChains';
  }

  /**
   * For now, we use network priorities as a proxy for "render-blocking"/critical-ness.
   * It's imperfect, but there is not a higher-fidelity signal available yet.
   * @see https://docs.google.com/document/d/1bCDuq9H1ih9iNjgzyAL0gpwNFiEP4TZS-YLRp_RuMlc
   * @param  {any} request
   */
  isCritical(request) {
    const resourceTypeCategory = request._resourceType && request._resourceType._category;

    // XHRs are fetched at High priority, but we exclude them, as they are unlikely to be critical
    // Images are also non-critical.
    // Treat any images missed by category, primarily favicons, as non-critical resources
    const nonCriticalResourceTypes = [
      WebInspector.resourceTypes.Image._category,
      WebInspector.resourceTypes.XHR._category
    ];
    if (nonCriticalResourceTypes.includes(resourceTypeCategory) ||
        request.mimeType && request.mimeType.startsWith('image/')) {
      return false;
    }

    return ['VeryHigh', 'High', 'Medium'].includes(request.priority());
  }

  compute_(networkRecords) {
    networkRecords = networkRecords.filter(req => req.finished);

    // Build a map of requestID -> Node.
    const requestIdToRequests = new Map();
    for (const request of networkRecords) {
      requestIdToRequests.set(request.requestId, request);
    }

    // Get all the critical requests.
    /** @type {!Array<NetworkRequest>} */
    const criticalRequests = networkRecords.filter(req => this.isCritical(req));

    const flattenRequest = request => {
      return {
        url: request._url,
        startTime: request.startTime,
        endTime: request.endTime,
        responseReceivedTime: request.responseReceivedTime,
        transferSize: request.transferSize
      };
    };

    // Create a tree of critical requests.
    const criticalRequestChains = {};
    for (const request of criticalRequests) {
      // Work back from this request up to the root. If by some weird quirk we are giving request D
      // here, which has ancestors C, B and A (where A is the root), we will build array [C, B, A]
      // during this phase.
      const ancestors = [];
      let ancestorRequest = request.initiatorRequest();
      let node = criticalRequestChains;
      while (ancestorRequest) {
        const ancestorIsCritical = this.isCritical(ancestorRequest);

        // If the parent request isn't a high priority request it won't be in the
        // requestIdToRequests map, and so we can break the chain here. We should also
        // break it if we've seen this request before because this is some kind of circular
        // reference, and that's bad.
        if (!ancestorIsCritical || ancestors.includes(ancestorRequest.requestId)) {
          // Set the ancestors to an empty array and unset node so that we don't add
          // the request in to the tree.
          ancestors.length = 0;
          node = undefined;
          break;
        }
        ancestors.push(ancestorRequest.requestId);
        ancestorRequest = ancestorRequest.initiatorRequest();
      }

      // With the above array we can work from back to front, i.e. A, B, C, and during this process
      // we can build out the tree for any nodes that have yet to be created.
      let ancestor = ancestors.pop();
      while (ancestor) {
        const parentRequest = requestIdToRequests.get(ancestor);
        const parentRequestId = parentRequest.requestId;
        if (!node[parentRequestId]) {
          node[parentRequestId] = {
            request: flattenRequest(parentRequest),
            children: {}
          };
        }

        // Step to the next iteration.
        ancestor = ancestors.pop();
        node = node[parentRequestId].children;
      }

      if (!node) {
        continue;
      }

      // If the node already exists, bail.
      if (node[request.requestId]) {
        continue;
      }

      // node should now point to the immediate parent for this request.
      node[request.requestId] = {
        request: flattenRequest(request),
        children: {}
      };
    }

    return criticalRequestChains;
  }
}

module.exports = CriticalRequestChains;
