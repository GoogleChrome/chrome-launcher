/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * Typing externs file for audit classes.
 * @externs
 */

/**
 * @struct
 * @record
 */
function AuditMeta() {}

/** @type {string} */
AuditMeta.prototype.category;

/** @type {string} */
AuditMeta.prototype.name;

/** @type {string} */
AuditMeta.prototype.description;

/** @type {?(boolean|number|string|undefined)} */
AuditMeta.prototype.optimalValue;

/** @type {!Array<string>} */
AuditMeta.prototype.requiredArtifacts;
