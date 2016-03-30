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
 * Typing externs file for the `devtools-timeline-model` module.
 * @externs
 */

/**
 * @constructor
 * @struct
 * @param {!Array<!Object>} traceData
 */
function DevtoolsTimelineModel(traceData) {};

/**
 * @return {!DevtoolsTimelineModel.Model}
 */
DevtoolsTimelineModel.prototype.timelineModel = function() {};

/**
 * @struct
 * @record
 */
DevtoolsTimelineModel.Model = function() {};

/**
 * @return {!Array<!DevtoolsTimelineModel.MainThreadEvent>}
 */
DevtoolsTimelineModel.Model.prototype.mainThreadEvents = function() {};

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
