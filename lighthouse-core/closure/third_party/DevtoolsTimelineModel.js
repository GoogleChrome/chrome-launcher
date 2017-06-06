/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * Typing externs file for the `devtools-timeline-model` module.
 * @externs
 */

/**
 * @constructor
 * @param {!Array<!Object>} traceData
 */
var DevtoolsTimelineModel = function(traceData) {};

/**
 * @return {!DevtoolsTimelineModel.TimelineModel}
 */
DevtoolsTimelineModel.prototype.timelineModel = function() {};

/**
 * @struct
 * @record
 */
DevtoolsTimelineModel.TimelineModel = function() {};

/**
 * @return {!Array<!DevtoolsTimelineModel.MainThreadEvent>}
 */
DevtoolsTimelineModel.TimelineModel.prototype.mainThreadEvents = function() {};

/**
 * @return {!DevtoolsTimelineModel.MainThreadAsyncEvents}
 */
DevtoolsTimelineModel.TimelineModel.prototype.mainThreadAsyncEvents = function() {};

/**
 * @struct
 * @record
 */
DevtoolsTimelineModel.MainThreadEvent = function() {};

/** @type {string} */
DevtoolsTimelineModel.MainThreadEvent.prototype.categoriesString;

/** @type {string} */
DevtoolsTimelineModel.MainThreadEvent.prototype.name;

/** @type {number} */
DevtoolsTimelineModel.MainThreadEvent.prototype.startTime;

/** @type {!Object} */
DevtoolsTimelineModel.MainThreadEvent.prototype.args;

/** @type {!string} */
DevtoolsTimelineModel.MainThreadEvent.prototype.phase;

/** @type {function(!string):!boolean} */
DevtoolsTimelineModel.MainThreadEvent.prototype.hasCategory;

/**
 * @struct
 * @record
 */
DevtoolsTimelineModel.MainThreadAsyncEvents = function() {};

/**
 * @type {function():!Array<string>}
 */
DevtoolsTimelineModel.MainThreadAsyncEvents.prototype.keys;

/**
 * @type {function(Object):!Array<!Object>}
 */
DevtoolsTimelineModel.MainThreadAsyncEvents.prototype.get;

/**
 * @see chrome-devtools-frontend/front_end/sdk/TracingModel.js
 * @struct
 * @record
 */
DevtoolsTimelineModel.TracingModel = function() {};

/**
 * @return {!Array.<!DevtoolsTimelineModel.TracingModel.Event>}
 */
DevtoolsTimelineModel.TracingModel.prototype.devToolsMetadataEvents = function() {};

/**
 * @see chrome-devtools-frontend/front_end/sdk/TracingModel.js
 * @struct
 * @record
 */
DevtoolsTimelineModel.TracingModel.Event = function() {};

/** @type {string} */
DevtoolsTimelineModel.TracingModel.Event.prototype.name;

/** @type {number} */
DevtoolsTimelineModel.TracingModel.Event.prototype.startTime;

/** @type {!Object} */
DevtoolsTimelineModel.TracingModel.Event.prototype.args;
