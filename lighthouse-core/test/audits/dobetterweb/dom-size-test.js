/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const DOMSize = require('../../../audits/dobetterweb/dom-size.js');
const assert = require('assert');

/* eslint-env mocha */

describe('Num DOM nodes audit', () => {
  const numNodes = DOMSize.MAX_DOM_NODES;
  const artifact = {
    DOMStats: {
      totalDOMNodes: numNodes,
      depth: {max: 1, pathToElement: ['html', 'body', 'div', 'span']},
      width: {max: 2, pathToElement: ['html', 'body']}
    }
  };

  const snippet = 'html >\n' +
                  '  body >\n' +
                  '    div >\n' +
                  '      span';

  it('calculates score hitting top of distribution', () => {
    const auditResult = DOMSize.audit(artifact);
    assert.equal(auditResult.score, 100);
    assert.equal(auditResult.rawValue, numNodes);
    assert.equal(auditResult.optimalValue, `< ${DOMSize.MAX_DOM_NODES.toLocaleString()} nodes`);
    assert.equal(auditResult.displayValue, `${numNodes.toLocaleString()} nodes`);
    assert.equal(auditResult.extendedInfo.value[0].title, 'Total DOM Nodes');
    assert.equal(auditResult.extendedInfo.value[0].value, numNodes.toLocaleString());
    assert.equal(auditResult.extendedInfo.value[1].title, 'DOM Depth');
    assert.equal(auditResult.extendedInfo.value[1].value, 1);
    assert.equal(auditResult.extendedInfo.value[1].snippet, snippet, 'generates snippet');
    assert.equal(auditResult.extendedInfo.value[2].title, 'Maximum Children');
    assert.equal(auditResult.extendedInfo.value[2].value, 2);
  });

  it('calculates score hitting mid distribution', () => {
    artifact.DOMStats.totalDOMNodes = 3100;
    assert.equal(DOMSize.audit(artifact).score, 43);
  });

  it('calculates score hitting bottom of distribution', () => {
    artifact.DOMStats.totalDOMNodes = 5970;
    assert.equal(DOMSize.audit(artifact).score, 0);
  });
});
