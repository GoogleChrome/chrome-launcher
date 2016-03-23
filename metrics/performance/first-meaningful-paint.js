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

const DevtoolsTimelineModel = require('devtools-timeline-model');

class FirstMeaningfulPaint {
  static parse(traceData) {
    return new Promise((resolve, reject) => {
      const model = new DevtoolsTimelineModel(traceData);
      const events = model.timelineModel().mainThreadEvents();
      const ret = {};

      const navStartEvent = events
          .filter(FirstMeaningfulPaint._filterEventsForNavStart);
      const firstTextPaintEvent = events
          .filter(FirstMeaningfulPaint._filterEventsForFirstTextPaint);

      if (firstTextPaintEvent.length && navStartEvent.length) {
        ret.duration = firstTextPaintEvent[0].startTime - navStartEvent[0].startTime;
      } else {
        ret.err = new Error('First meaningful paint metric not found');
      }

      resolve(ret);
    });
  }

  static _filterEventsForNavStart(e) {
    return e.categoriesString.includes('blink.user_timing') &&
        e.name === 'navigationStart';
  }

  static _filterEventsForFirstTextPaint(e) {
    return e.categoriesString.includes('blink.user_timing') &&
        e.name === 'firstTextPaint';
  }
}

module.exports = FirstMeaningfulPaint;
