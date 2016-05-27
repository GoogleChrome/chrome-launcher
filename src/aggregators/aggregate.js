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

class Aggregate {

  /**
   * The types of aggregation supported by Lighthouse. These are used by the HTML Report
   * to broadly classify the outputs. Most of the audits will be included in aggregations
   * that are of TYPES.PWA, but any non-PWA best practices should be in aggregators of
   * TYPES.BEST_PRACTICE.
   */
  static get TYPES() {
    return {
      PWA: {
        name: 'Progressive Web App',
        contributesToScore: true
      },
      BEST_PRACTICE: {
        name: 'Best Practices',
        contributesToScore: false
      },
      PERFORMANCE_METRICS: {
        name: 'Performance Metrics',
        contributesToScore: false
      }
    };
  }

  /**
   * @throws {Error}
   * @return {string} The name for this aggregation.
   */
  static get name() {
    throw new Error('Aggregate name must be overridden');
  }

  /**
   * @throws {Error}
   * @return {string} The short name for this aggregation.
   */
  static get description() {
    throw new Error('Aggregate description must be overridden');
  }

  /**
   * @throws {Error}
   * @return {Object} The type of aggregation.
   */
  static get type() {
    throw new Error('Aggregate type must be overridden');
  }

  /**
   * @throws {Error}
   * @return {!AggregationCriteria} The criteria for this aggregation.
   */
  static get criteria() {
    throw new Error('Aggregate criteria must be overridden');
  }

  /**
   * @private
   * @param {!Array<!AuditResult>} results
   * @param {!AggregationCriteria} expected
   * @return {!Array<!AuditResult>}
   */
  static _filterResultsByAuditNames(results, expected) {
    const expectedNames = Object.keys(expected);
    return results.filter(r => expectedNames.indexOf(r.name) !== -1);
  }

  /**
   * @private
   * @param {!AggregationCriteria} expected
   * @return {number}
   */
  static _getTotalWeight(expected) {
    const expectedNames = Object.keys(expected);
    let weight = expectedNames.reduce((last, e) => last + expected[e].weight, 0);
    if (weight === 0) {
      weight = 1;
    }

    return weight;
  }

  /**
   * @private
   * @param {!Array<!AuditResult>} results
   * @return {!Object<!AuditResult>}
   */
  static _remapResultsByName(results) {
    const remapped = {};
    results.forEach(r => {
      if (remapped[r.name]) {
        throw new Error(`Cannot remap: ${r.name} already exists`);
      }

      remapped[r.name] = r;
    });
    return remapped;
  }

  /**
   * Converts each raw audit output to a weighted value for the aggregation.
   * @private
   * @param {!AuditResult} result The audit's output value.
   * @param {!AggregationCriterion} expected The aggregation's expected value and weighting for this result.
   * @return {number} The weighted result.
   */
  static _convertToWeight(result, expected) {
    let weight = 0;

    if (typeof expected === 'undefined' ||
        typeof expected.value === 'undefined' ||
        typeof expected.weight === 'undefined') {
      return weight;
    }

    if (typeof result === 'undefined' ||
        typeof result.value === 'undefined') {
      return weight;
    }

    if (typeof result.value !== typeof expected.value) {
      return weight;
    }

    switch (typeof expected.value) {
      case 'boolean':
        weight = this._convertBooleanToWeight(result.value, expected.value, expected.weight);
        break;

      case 'number':
        weight = this._convertNumberToWeight(result.value, expected.value, expected.weight);
        break;

      default:
        weight = 0;
        break;
    }

    return weight;
  }

  /**
   * Converts a numeric result to a weight.
   * @param {number} resultValue The result.
   * @param {number} expectedValue The expected value.
   * @param {number} weight The weight to assign.
   * @return {number} The final weight.
   */
  static _convertNumberToWeight(resultValue, expectedValue, weight) {
    return (resultValue / expectedValue) * weight;
  }

  /**
   * Converts a boolean result to a weight.
   * @param {boolean} resultValue The result.
   * @param {boolean} expectedValue The expected value.
   * @param {number} weight The weight to assign.
   * @return {number} The final weight.
   */
  static _convertBooleanToWeight(resultValue, expectedValue, weight) {
    return (resultValue === expectedValue) ? weight : 0;
  }

  /**
   * Compares the set of audit results to the expected values.
   * @param {!Array<!AuditResult>} results The audit results.
   * @param {!AggregationCriteria} expected The aggregation's expected values and weighting.
   * @return {!AggregationItem} The aggregation score.
   */
  static compare(results, expected) {
    const expectedNames = Object.keys(expected);

    // Filter down and remap the results to something more comparable to
    // the expected set of results.
    const filteredAndRemappedResults =
        Aggregate._remapResultsByName(
          Aggregate._filterResultsByAuditNames(results, expected)
        );
    const maxScore = Aggregate._getTotalWeight(expected);
    const subItems = [];
    let overallScore = 0;

    // Step through each item in the expected results, and add them
    // to the overall score and add each to the subItems list.
    expectedNames.forEach(e => {
      // TODO(paullewis): Remove once coming soon audits have landed.
      if (expected[e].comingSoon) {
        subItems.push({
          value: String.raw`¯\_(ツ)_/¯`,
          name: 'coming-soon',
          category: expected[e].category,
          description: expected[e].description,
          comingSoon: true
        });

        return;
      }

      if (!filteredAndRemappedResults[e]) {
        return;
      }

      subItems.push(filteredAndRemappedResults[e]);

      // Only add to the score if this aggregation contributes to the
      // overall score.
      if (!filteredAndRemappedResults[e].contributesToScore) {
        return;
      }

      overallScore += Aggregate._convertToWeight(
          filteredAndRemappedResults[e],
          expected[e]);
    });

    return {
      overall: (overallScore / maxScore),
      subItems: subItems
    };
  }

  /**
   * Aggregates all the results.
   * @param {!Array<!AuditResult>} results
   * @return {!Aggregation}
   */
  static aggregate(results) {
    return {
      name: this.name,
      shortName: this.shortName,
      description: this.description,
      type: this.type,
      score: Aggregate.compare(results, this.criteria)
    };
  }
}

module.exports = Aggregate;
