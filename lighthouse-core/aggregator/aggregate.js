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
    return results.filter(r => expectedNames.includes(/** @type {string} */ (r.name)));
  }

  /**
   * @private
   * @param {!AggregationCriteria} expected
   * @return {number}
   */
  static _getTotalWeight(expected) {
    const expectedNames = Object.keys(expected);
    const totalWeight = expectedNames.reduce((last, e) => last + (expected[e].weight || 0), 0);
    return totalWeight;
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
   * @param {!string} name The name of the audit.
   * @return {number} The weighted result.
   */
  static _convertToWeight(result, expected, name) {
    let weight = 0;

    if (typeof expected === 'undefined' ||
        typeof expected.expectedValue === 'undefined' ||
        typeof expected.weight === 'undefined') {
      const msg =
          `aggregations: ${name} audit does not contain expectedValue or weight properties`;
      throw new Error(msg);
    }

    // Audit resulted in an error, so doesn't contribute to score.
    // TODO: could do NaN instead, as score becomes somewhat meaningless.
    if (result.error) {
      return 0;
    }

    if (typeof result === 'undefined' ||
        typeof result.score === 'undefined') {
      let msg =
          `${name} audit result is undefined or does not contain score property`;
      if (result && result.debugString) {
        msg += ': ' + result.debugString;
      }
      throw new Error(msg);
    }

    if (typeof result.score !== typeof expected.expectedValue) {
      const expectedType = typeof expected.expectedValue;
      const resultType = typeof result.rawValue;
      let msg = `Expected expectedValue of type ${expectedType}, got ${resultType}`;
      if (result.debugString) {
        msg += ': ' + result.debugString;
      }
      throw new Error(msg);
    }

    switch (typeof expected.expectedValue) {
      case 'boolean':
        weight = this._convertBooleanToWeight(result.score,
            expected.expectedValue, expected.weight);
        break;

      case 'number':
        weight = this._convertNumberToWeight(result.score, expected.expectedValue, expected.weight);
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
   * @return {!Array<!AggregationResultItem>} The aggregation score.
   */
  static compare(results, items) {
    return items.map(item => {
      const expectedNames = Object.keys(item.audits);

      // Filter down and remap the results to something more comparable to
      // the expected set of results.
      const filteredAndRemappedResults =
          Aggregate._remapResultsByName(
            Aggregate._filterResultsByAuditNames(results, item.audits)
          );

      const subItems = [];
      let overallScore = 0;
      let maxScore = 1;

      // Step through each item in the expected results, and add them
      // to the overall score and add each to the subItems list.
      expectedNames.forEach(e => {
        if (!filteredAndRemappedResults[e]) {
          throw new Error(`aggregations: expected audit results not found under audit name ${e}`);
        }

        subItems.push(filteredAndRemappedResults[e].name);

        overallScore += Aggregate._convertToWeight(
            filteredAndRemappedResults[e],
            item.audits[e],
            e);
      });

      maxScore = Aggregate._getTotalWeight(item.audits);

      return {
        overall: (overallScore / maxScore),
        name: item.name,
        description: item.description,
        subItems: subItems
      };
    });
  }

  /**
   * Calculates total score of an aggregate.
   * @param {!Array<!AggregationResultItem>} scores
   * @return {number}
   */
  static getTotal(scores) {
    return scores.reduce((total, s) => total + s.overall, 0) / scores.length;
  }

  /**
   * Aggregates all the results.
   * @param {!Aggregation} aggregation
   * @param {!Array<!AuditResult>} auditResults
   * @return {!AggregationResult}
   */
  static aggregate(aggregation, auditResults) {
    const score = Aggregate.compare(auditResults, aggregation.items);
    return {
      name: aggregation.name,
      description: aggregation.description,
      scored: aggregation.scored,
      additional: aggregation.additional,
      total: (aggregation.scored ? Aggregate.getTotal(score) : null),
      categorizable: aggregation.categorizable,
      score: score
    };
  }
}

module.exports = Aggregate;
