/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audits a page to see how the size of DOM it creates. Stats like
 * tree depth, # children, and total nodes are returned. The score is calculated
 * based solely on the total number of nodes found on the page.
 */

'use strict';

const Audit = require('../audit');
const TracingProcessor = require('../../lib/traces/tracing-processor');
const Formatter = require('../../report/formatter');

const MAX_DOM_NODES = 1500;
const MAX_DOM_TREE_WIDTH = 60;
const MAX_DOM_TREE_DEPTH = 32;

// Parameters for log-normal CDF scoring. See https://www.desmos.com/calculator/9cyxpm5qgp.
const SCORING_POINT_OF_DIMINISHING_RETURNS = 2400;
const SCORING_MEDIAN = 3000;

class DOMSize extends Audit {
  static get MAX_DOM_NODES() {
    return MAX_DOM_NODES;
  }

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'dom-size',
      description: 'Avoids an excessive DOM size',
      optimalValue: `< ${DOMSize.MAX_DOM_NODES.toLocaleString()} nodes`,
      helpText: 'Browser engineers recommend pages contain fewer than ' +
        `~${DOMSize.MAX_DOM_NODES.toLocaleString()} DOM nodes. The sweet spot is a tree depth < ` +
        `${MAX_DOM_TREE_DEPTH} elements and fewer than ${MAX_DOM_TREE_WIDTH} ` +
        'children/parent element. A large DOM can increase memory usage, cause longer ' +
        '[style calculations](https://developers.google.com/web/fundamentals/performance/rendering/reduce-the-scope-and-complexity-of-style-calculations), ' +
        'and produce costly [layout reflows](https://developers.google.com/speed/articles/reflow). [Learn more](https://developers.google.com/web/fundamentals/performance/rendering/).',
      scoringMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['DOMStats']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const stats = artifacts.DOMStats;

    /**
     * html >
     *   body >
     *     div >
     *       span
     */
    const depthSnippet = stats.depth.pathToElement.reduce((str, curr, i) => {
      return `${str}\n` + '  '.repeat(i) + `${curr} >`;
    }, '').replace(/>$/g, '').trim();
    const widthSnippet = 'Element with most children:\n' +
        stats.width.pathToElement[stats.width.pathToElement.length - 1];

    // Use the CDF of a log-normal distribution for scoring.
    //   <= 1500: score≈100
    //   3000: score=50
    //   >= 5970: score≈0
    const distribution = TracingProcessor.getLogNormalDistribution(
        SCORING_MEDIAN, SCORING_POINT_OF_DIMINISHING_RETURNS);
    let score = 100 * distribution.computeComplementaryPercentile(stats.totalDOMNodes);

    // Clamp the score to 0 <= x <= 100.
    score = Math.max(0, Math.min(100, score));

    const cards = [{
      title: 'Total DOM Nodes',
      value: stats.totalDOMNodes.toLocaleString(),
      target: `< ${MAX_DOM_NODES.toLocaleString()} nodes`
    }, {
      title: 'DOM Depth',
      value: stats.depth.max.toLocaleString(),
      snippet: depthSnippet,
      target: `< ${MAX_DOM_TREE_DEPTH.toLocaleString()}`
    }, {
      title: 'Maximum Children',
      value: stats.width.max.toLocaleString(),
      snippet: widthSnippet,
      target: `< ${MAX_DOM_TREE_WIDTH.toLocaleString()} nodes`
    }];

    return {
      rawValue: stats.totalDOMNodes,
      optimalValue: this.meta.optimalValue,
      score: Math.round(score),
      displayValue: `${stats.totalDOMNodes.toLocaleString()} nodes`,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.CARDS,
        value: cards
      },
      details: {
        type: 'cards',
        header: {type: 'text', text: 'View details'},
        items: cards
      }
    };
  }

}

module.exports = DOMSize;
