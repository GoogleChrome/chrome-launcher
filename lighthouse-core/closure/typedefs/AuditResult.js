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
 * Typing externs file for the result of an audit.
 * @externs
 */

/**
 * @struct
 * @record
 */
function AuditResultInput() {}

/** @type {(boolean|number|string)} */
AuditResultInput.prototype.score;

/** @type {(boolean|number|undefined)} */
AuditResultInput.prototype.rawValue;

/** @type {(string)} */
AuditResultInput.prototype.displayValue;

/** @type {(string|undefined)} */
AuditResultInput.prototype.debugString;

/** @type {(boolean|number|string|undefined|null)} */
AuditResultInput.prototype.optimalValue;

/** @type {(AuditExtendedInfo|undefined|null)} */
AuditResultInput.prototype.extendedInfo;

/**
 * @struct
 * @record
 */
function AuditExtendedInfo() {}

/** @type {string} */
AuditExtendedInfo.prototype.formatter;

/** @type {(Object|Array<UserTimingsExtendedInfo>|FirstMeaningfulPaintExtendedInfo|undefined)} */
AuditExtendedInfo.prototype.value;

/**
 * @struct
 * @record
 */
function UserTimingsExtendedInfo() {}

/** @type {!string} */
UserTimingsExtendedInfo.prototype.name;

/** @type {!boolean} */
UserTimingsExtendedInfo.prototype.isMark;

/** @type {!Object} */
UserTimingsExtendedInfo.prototype.args;

/** @type {!number} */
UserTimingsExtendedInfo.prototype.startTime;

/** @type {(number|undefined)} */
UserTimingsExtendedInfo.prototype.endTime;

/** @type {(number|undefined)} */
UserTimingsExtendedInfo.prototype.duration;

/**
 * @struct
 * @record
 */
function FirstMeaningfulPaintExtendedInfo() {}

/** @type {!FirstMeaningfulPaintTimings} */
FirstMeaningfulPaintExtendedInfo.prototype.timings;

/**
 * @struct
 * @record
 */
function FirstMeaningfulPaintTimings() {}

/** @type {number} */
FirstMeaningfulPaintTimings.prototype.fCP;

/** @type {number} */
FirstMeaningfulPaintTimings.prototype.fMP;

/** @type {number} */
FirstMeaningfulPaintTimings.prototype.navStart;

/**
 * @struct
 * @record
 */
function AuditResult() {}

/** @type {(boolean|number|string)} */
AuditResult.prototype.score;

/** @type {(boolean|number|string|undefined|null)} */
AuditResult.prototype.rawValue;

/** @type {(string|undefined)} */
AuditResult.prototype.debugString;

/** @type {(boolean|number|string|undefined|null)} */
AuditResult.prototype.optimalValue;

/** @type {(AuditExtendedInfo|undefined|null)} */
AuditResult.prototype.extendedInfo;

/** @type {(string|undefined)} */
AuditResult.prototype.name;

/** @type {(string|undefined)} */
AuditResult.prototype.category;

/** @type {(string|undefined)} */
AuditResult.prototype.description;

/** @type {(boolean|undefined)} */
AuditResult.prototype.contributesToScore;
