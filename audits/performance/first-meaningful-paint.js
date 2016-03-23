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

const FMPMetric = require('../../metrics/performance/first-meaningful-paint');

class FirstMeaningfulPaint {

  static get tags() {
    return ['Performance'];
  }

  static get description() {
    return 'Has a good first meaningful paint';
  }

  /**
   * Audits the page to give a score for First Meaningful Paint.
   * @see  https://github.com/GoogleChrome/lighthouse/issues/26
   * @param  {Object} inputs The inputs from the gather phase.
   * @return {Object} The score from the audit, ranging from 0-100.
   */
  static audit(inputs) {
    return FMPMetric
        .parse(inputs.traceContents)
        .then(fmp => {
          if (fmp.err) {
            return -1;
          }

          // Roughly an exponential curve.
          // < 1000ms: penalty=0
          // 3000ms: penalty=90
          // >= 5000ms: penalty=100
          const power = (fmp.duration - 1000) * 0.001 * 0.5;
          const penalty = power > 0 ? Math.pow(10, power) : 0;
          let score = 100 - penalty;

          // Clamp the score to 0 <= x <= 100.
          score = Math.min(100, score);
          score = Math.max(0, score);

          return score;
        }, _ => {
          // Recover from trace parsing failures.
          return -1;
        })
        .then(score => {
          return {
            value: score,
            tags: FirstMeaningfulPaint.tags,
            description: FirstMeaningfulPaint.description
          };
        });
  }
}

module.exports = FirstMeaningfulPaint;
