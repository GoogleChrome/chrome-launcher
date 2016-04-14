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
'use strict';

const DevtoolsTimelineModel = require('../../helpers/traces/devtools-timeline-model');

const FAILURE_MESSAGE = 'Navigation and first paint timings not found.';

class FirstMeaningfulPaint {

  /**
   * @param {!Array<!Object>} traceData
   */
  static parse(traceData) {
    return new Promise((resolve, reject) => {
      if (!traceData || !Array.isArray(traceData)) {
        return reject(new Error(FAILURE_MESSAGE));
      }

      const model = new DevtoolsTimelineModel(traceData);
      const events = model.timelineModel().mainThreadEvents();
      let mainFrameID;
      let navigationStart;
      let firstContentfulPaint;

      // Find the start of navigation and our meaningful paint
      events
        .filter(e => e.categoriesString.includes('blink.user_timing'))
        .forEach(event => {
          // navigationStart == the network begins fetching the page URL
          // CommitLoad == the first bytes of HTML are returned and Chrome considers
          //   the navigation a success. A 'isMainFrame' boolean is attached to those events
          //   However, that flag may be incorrect now, so we're ignoring it.
          if (event.name === 'navigationStart' && !navigationStart) {
            mainFrameID = event.args.frame;
            navigationStart = event;
          }
          // firstContentfulPaint == the first time that text or image content was
          // painted. See src/third_party/WebKit/Source/core/paint/PaintTiming.h
          if (event.name === 'firstContentfulPaint' && event.args.frame === mainFrameID) {
            firstContentfulPaint = event;
          }
        });

      // report the raw numbers
      if (firstContentfulPaint && navigationStart) {
        return resolve({
          navigationStart: /** @type {number} */ (navigationStart.startTime),
          firstMeaningfulPaint: /** @type {number} */ (firstContentfulPaint.startTime)
        });
      }
      return reject(new Error(FAILURE_MESSAGE));
    });
  }
}

module.exports = FirstMeaningfulPaint;
