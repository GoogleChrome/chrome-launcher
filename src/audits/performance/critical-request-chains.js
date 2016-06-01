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

const Audit = require('../audit');
const Formatter = require('../../../formatters/formatter');

class CriticalRequestChains extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'critical-request-chains',
      description: 'Critical Request Chains',
      optimalValue: 0,
      requiredArtifacts: ['criticalRequestChains']
    };
  }

  /**
   * Audits the page to give a score for First Meaningful Paint.
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @return {!AuditResult} The score from the audit, ranging from 0-100.
   */
  static audit(artifacts) {
    let chainCount = 0;
    function walk(node, depth) {
      const children = Object.keys(node);

      // Since a leaf node indicates the end of a chain, we can inspect the number
      // of child nodes, and, if the count is zero, increment the count.
      if (children.length === 0) {
        chainCount++;
      }

      children.forEach(id => {
        const child = node[id];
        walk(child.children, depth + 1);
      }, '');
    }

    walk(artifacts.criticalRequestChains, 0);

    return CriticalRequestChains.generateAuditResult({
      value: chainCount,
      optimalValue: this.meta.optimalValue,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.CRITICAL_REQUEST_CHAINS,
        value: artifacts.criticalRequestChains
      }
    });
  }
}

module.exports = CriticalRequestChains;
