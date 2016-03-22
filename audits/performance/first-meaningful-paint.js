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

const FMP = require('../../metrics/performance/first-meaningful-paint');

class FirstMeaningfulPaint {

  static get tags() {
    return ['Performance'];
  }

  static get description() {
    return 'Has a good first meaningful paint';
  }

  static audit(inputs) {
    let score = 100;

    try {
      const fmp = new FMP(inputs.traceContents);
      if (fmp.err) {
        score = -1;
      } else {
        score -= Math.max(0, fmp.duration - 1000) / 200;
      }
    } catch (e) {
      score = -1;
    }

    return {
      value: score,
      tags: FirstMeaningfulPaint.tags,
      description: FirstMeaningfulPaint.description
    };
  }
}

module.exports = FirstMeaningfulPaint;
