/**
 * Copyright 2017 Google Inc. All rights reserved.
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
 * Typing externs file for computed artifacts object.
 * @externs
 */

/** @typedef
  {{
    processEvents: !Array<!TraceEvent>,
    startedInPageEvt: !TraceEvent,
    navigationStartEvt: !TraceEvent,
    firstPaintEvt: TraceEvent,
    firstContentfulPaintEvt: TraceEvent,
    firstMeaningfulPaintEvt: TraceEvent
  }} */
let TraceOfTabArtifact;

/**
 * @constructor
 * @struct
 * @record
 */
function ComputedArtifacts() {}

/** @type {function(!Array): !Promise<!Object>} */
ComputedArtifacts.prototype.requestCriticalRequestChains;

/** @type {function(!DevtoolsLog): !Promise<!Array<!WebInspector.NetworkRequest>>} */
ComputedArtifacts.prototype.requestNetworkRecords;

/** @type {function(ManifestNode<(!Manifest|undefined)>): !Promise<{isParseFailure: boolean, parseFailureReason: string, allChecks: !Array<{passing: boolean, failureText: string}>}>} */
ComputedArtifacts.prototype.requestManifestValues;

/** @type {function(!Array): !Promise<number>} */
ComputedArtifacts.prototype.requestNetworkThroughput;

// ComputedArtifacts.prototype.requestPushedRequests;

// ComputedArtifacts.prototype.requestScreenshots;

/** @type {function(!Trace): !Promise<!SpeedlineArtifact>} */
ComputedArtifacts.prototype.requestSpeedline;

/** @type {function(!Trace): !Promise<!TraceOfTabArtifact>} */
ComputedArtifacts.prototype.requestTraceOfTab;

/** @type {function(!Trace): !Promise<!tr.Model>} */
ComputedArtifacts.prototype.requestTracingModel;

/** @type {function(!Trace): !Promise<{timeInMs: number, timestamp: number}>} */
ComputedArtifacts.prototype.requestFirstInteractive;
