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
function AggregationItem() {}

/** @type {number} */
AggregationItem.prototype.overall;

/** @type {!Array<!AuditResult>} */
AggregationItem.prototype.subItems;

/**
 * @struct
 * @record
 */
function AggregationType() {}

/** @type {string} */
AggregationType.prototype.name;

/** @type {boolean} */
AggregationType.prototype.contributesToScore;

/**
 * @struct
 * @record
 */
function Aggregation() {}

/** @type {string} */
Aggregation.prototype.name;

/** @type {string} */
Aggregation.prototype.description;

/** @type {!AggregationItem} */
Aggregation.prototype.score;

/** @type {!AggregationType} */
Aggregation.prototype.type;

/**
 * @struct
 * @record
 */
function AggregationCriterion() {}

/** @type {(boolean|number|undefined)} */
AggregationCriterion.prototype.value;

/** @type {number} */
AggregationCriterion.prototype.weight;

/** @type {boolean|undefined} */
AggregationCriterion.prototype.comingSoon;

/** @type {string|undefined} */
AggregationCriterion.prototype.category;

/** @type {string|undefined} */
AggregationCriterion.prototype.description;

/**
 * @typedef {!Object<!AggregationCriterion>}
 */
var AggregationCriteria;
