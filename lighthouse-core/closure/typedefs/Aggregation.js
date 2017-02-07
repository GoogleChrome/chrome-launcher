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

/**
 * Typing externs file for collected output of the artifact gatherers stage.
 * @externs
 */

/**
 * @struct
 * @record
 */
function AggregationCriterion() {}

/** @type {(boolean|number|undefined)} */
AggregationCriterion.prototype.rawValue;

/** @type {number} */
AggregationCriterion.prototype.weight;

/** @type {string|undefined} */
AggregationCriterion.prototype.category;

/** @type {string|undefined} */
AggregationCriterion.prototype.description;

/**
 * @typedef {!Object<!AggregationCriterion>}
 */
var AggregationCriteria;

/**
 * @struct
 * @record
 */
function AggregationItem() {}

/** @type {!Object<!AggregationCriterion>} */
AggregationItem.prototype.audits;

/** @type {string} */
AggregationItem.prototype.name;

/** @type {string} */
AggregationItem.prototype.description;

/**
 * @struct
 * @record
 */
function Aggregation() {}

/** @type {string} */
Aggregation.prototype.name;

/** @type {string} */
Aggregation.prototype.description;

/** @type {boolean} */
Aggregation.prototype.scored;

/** @type {boolean} */
Aggregation.prototype.categorizable;

/** @type {!Array<!AggregationItem>} */
Aggregation.prototype.items;

/**
 * @struct
 * @record
 */
function AggregationResultItem() {}

/** @type {number} */
AggregationResultItem.prototype.overall;

/** @type {string} */
AggregationResultItem.prototype.name;

/** @type {string} */
AggregationResultItem.prototype.description;

/** @type {!Array<!string>} */
AggregationResultItem.prototype.subItems;

/**
 * @struct
 * @record
 */
function AggregationResult() {}

/** @type {string} */
AggregationResult.prototype.name;

/** @type {string} */
AggregationResult.prototype.description;

/** @type {boolean} */
AggregationResult.prototype.scored;

/** @type {boolean} */
AggregationResult.prototype.categorizable;

/** @type {!Array<!AggregationResultItem>} */
AggregationResult.prototype.score;
