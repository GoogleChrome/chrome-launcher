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
   * @private
   * @param {!Array<!AuditResult>} results
   * @param {!AggregationCriteria} expected
   * @return {!Array<!AuditResult>}
   */
  static _filterResultsByAuditNames(results, expected) {
    const expectedNames = Object.keys(expected);
    return results.filter(r => expectedNames.indexOf(/** @type {string} */ (r.name)) !== -1);
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
   * @param {!Array<!AggregationItem>} items The aggregation's expected values and weighting.
   * @param {!boolean} aggregationIsScored Whether or not the aggregation is scored.
   * @return {!Array<!AggregationResultItem>} The aggregation score.
   */
  static compare(results, items, aggregationIsScored) {
    return items.map(item => {
      const expectedNames = Object.keys(item.criteria);

      // Filter down and remap the results to something more comparable to
      // the expected set of results.
      const filteredAndRemappedResults =
          Aggregate._remapResultsByName(
            Aggregate._filterResultsByAuditNames(results, item.criteria)
          );
      const maxScore = Aggregate._getTotalWeight(item.criteria);
      const subItems = [];
      let overallScore = 0;

      // Step through each item in the expected results, and add them
      // to the overall score and add each to the subItems list.
      expectedNames.forEach(e => {
        /* istanbul ignore if */
        // TODO(paullewis): Remove once coming soon audits have landed.
        if (item.criteria[e].comingSoon) {
          subItems.push({
            value: '¯\\_(ツ)_/¯', // TODO(samthor): Patch going to Closure, String.raw is badly typed
            name: 'coming-soon',
            category: item.criteria[e].category,
            description: item.criteria[e].description,
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
        if (!aggregationIsScored) {
          return;
        }

        overallScore += Aggregate._convertToWeight(
            filteredAndRemappedResults[e],
            item.criteria[e]);
      });

      return {
        overall: (overallScore / maxScore),
        name: item.name,
        description: item.description,
        subItems: subItems
      };
    });
  }

  /**
   * Aggregates all the results.
   * @param {!Aggregation} aggregation
   * @param {!Array<!AuditResult>} results
   * @return {!AggregationResult}
   */
  static aggregate(aggregation, results) {
    return {
      name: aggregation.name,
      description: aggregation.description,
      scored: aggregation.scored,
      categorizable: aggregation.categorizable,
      score: Aggregate.compare(results, aggregation.items, aggregation.scored)
    };
  }
}

module.exports = Aggregate;
