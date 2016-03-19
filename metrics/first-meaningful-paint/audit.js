/**
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
'use strict';

var DevtoolsTimelineModel = require('devtools-timeline-model');

module.exports = function(data) {
  // FIXME(paulirish) save the trace to file in debug file for later analysis.
  var model = new DevtoolsTimelineModel(data.traceContents);
  var events = model.timelineModel().mainThreadEvents();

  var navStartEvent = events.filter(e => e.name === 'navigationStart');
  var firstTextPaintEvent = events.filter(e =>
    e.categoriesString.includes('blink.user_timing') && e.name === 'firstTextPaint'
  );
  var duration = firstTextPaintEvent[0].startTime - navStartEvent[0].startTime;

  return {
    'first-meaningful-paint': {
      duration: duration
    }
  };
};
