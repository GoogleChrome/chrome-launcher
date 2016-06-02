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
function Artifacts() {}

/** @type {string} */
Artifacts.prototype.html;

/** @type {boolean} */
Artifacts.prototype.https;

/** @type {!Array<!Object>} */
Artifacts.prototype.networkRecords;

/** @type {?} */
Artifacts.prototype.traceContents;

/** @type {!ManifestNode<(!Manifest|undefined)>} */
Artifacts.prototype.manifest;

/** @type {!ServiceWorkerVersions} */
Artifacts.prototype.serviceWorkers;

/** @type {?string} */
Artifacts.prototype.themeColorMeta;

/** @type {string} */
Artifacts.prototype.url;

/** @type {?string} */
Artifacts.prototype.viewport;

/** @type {number} */
Artifacts.prototype.responseCode;

/** @type {number} */
Artifacts.prototype.offlineResponseCode;

/** @type {{value: boolean, debugString: (string|undefined)}} */
Artifacts.prototype.redirectsHTTP;

/** @type {!Accessibility} */
Artifacts.prototype.accessibility;

/** @type {!Array<!Object>} */
Artifacts.prototype.screenshots;

/** @type {!Object<!Object>} */
Artifacts.prototype.criticalRequestChains;

/** @type {{first: number, complete: number, duration: number, frames: !Array<!Object>, debugString: (string|undefined)}} */
Artifacts.prototype.speedline;
