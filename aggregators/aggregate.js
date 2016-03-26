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

  static get name() {
    throw new Error('Aggregate name must be overridden');
  }

  static get criteria() {
    throw new Error('Aggregate criteria must be overridden');
  }

  static _filterResultsByAuditNames(results, expected) {
    const expectedNames = Object.keys(expected);
    return results.filter(r => expectedNames.indexOf(r.name) !== -1);
  }

  static _getTotalWeight(expected) {
    const expectedNames = Object.keys(expected);
    let weight = expectedNames.reduce((last, e) => last + expected[e].weight, 0);
    if (weight === 0) {
      weight = 1;
    }

    return weight;
  }

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
        weight = (result.value === expected.value) ? expected.weight : 0;
        break;

      case 'number':
        weight = (result.value / expected.value) * expected.weight;
        break;

      default:
        weight = 0;
        break;
    }

    return weight;
  }

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

    // Step through each item in the expected results, and
    expectedNames.forEach(e => {
      if (!filteredAndRemappedResults[e]) {
        return;
      }

      overallScore += Aggregate._convertToWeight(
          filteredAndRemappedResults[e],
          expected[e]);

      subItems.push(filteredAndRemappedResults[e]);
    });

    return {
      overall: (overallScore / maxScore),
      subItems: subItems
    };
  }

  static aggregate(results) {
    return {
      name: this.name,
      score: Aggregate.compare(results, this.criteria)
    };
  }
}

module.exports = Aggregate;
