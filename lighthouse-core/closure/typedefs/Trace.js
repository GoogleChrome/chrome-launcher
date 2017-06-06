/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * Typing externs file for raw trace events
 * @see https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview
 * @externs
 */

/**
 * @struct
 * @record
 */
function TraceEvent() {}

/** @type {string} */
TraceEvent.prototype.cat;

/** @type {number} */
TraceEvent.prototype.pid;

/** @type {number} */
TraceEvent.prototype.tid;

/** @type {number} */
TraceEvent.prototype.ts;

/** @type {string} */
TraceEvent.prototype.ph;

/** @type {string} */
TraceEvent.prototype.name;

/** @type {!Object} */
TraceEvent.prototype.args;

/** @type {number} */
TraceEvent.prototype.dur;

/** @type {string} */
TraceEvent.prototype.id;

/** @type {string} */
TraceEvent.prototype.bind_id;


/**
 * @struct
 * @record
 */
function Trace() {}

/** @type {{traceEvents: !Array<!TraceEvent>}} */
Trace.prototype.traceEvents;
