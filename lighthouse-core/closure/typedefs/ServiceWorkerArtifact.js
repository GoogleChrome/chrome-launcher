/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * Typing externs file for Chrome protocol ServiceWorker.workerVersionUpdated request, used as an
 * artifact.
 * @see https://chromedevtools.github.io/debugger-protocol-viewer/ServiceWorker/#event-workerVersionUpdated
 * @externs
 */

/**
 * @struct
 * @record
 */
function ServiceWorkerArtifact() {}

/** @type {(string|undefined)} */
ServiceWorkerArtifact.prototype.debugString;

/** @type {(!Array<!ServiceWorkerVersion>|undefined)} */
ServiceWorkerArtifact.prototype.versions;

/**
 * @struct
 * @record
 */
function ServiceWorkerVersion() {}

/** @type {string} */
ServiceWorkerVersion.prototype.versionId;

/** @type {string} */
ServiceWorkerVersion.prototype.registrationId;

/** @type {string} */
ServiceWorkerVersion.prototype.scriptURL;

/** @type {string} */
ServiceWorkerVersion.prototype.runningStatus;

/** @type {string} */
ServiceWorkerVersion.prototype.status;

/** @type {number} */
ServiceWorkerVersion.prototype.scriptLastModified;

/** @type {number} */
ServiceWorkerVersion.prototype.scriptResponseTime;

/** @type {!Array<string>} */
ServiceWorkerVersion.prototype.controlledClients;
