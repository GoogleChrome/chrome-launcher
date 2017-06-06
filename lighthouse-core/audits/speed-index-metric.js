/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const TracingProcessor = require('../lib/traces/tracing-processor');
const Formatter = require('../report/formatter');

// Parameters (in ms) for log-normal CDF scoring. To see the curve:
// https://www.desmos.com/calculator/mdgjzchijg
const SCORING_POINT_OF_DIMINISHING_RETURNS = 1250;
const SCORING_MEDIAN = 5500;

class SpeedIndexMetric extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'speed-index-metric',
      description: 'Perceptual Speed Index',
      helpText: 'Speed Index shows how quickly the contents of a page are visibly populated. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/speed-index).',
      optimalValue: `< ${SCORING_POINT_OF_DIMINISHING_RETURNS.toLocaleString()}`,
      scoringMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces']
    };
  }

  /**
   * Audits the page to give a score for the Speed Index.
   * @see  https://github.com/GoogleChrome/lighthouse/issues/197
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @return {!Promise<!AuditResult>} The score from the audit, ranging from 0-100.
   */
  static audit(artifacts) {
    const trace = artifacts.traces[this.DEFAULT_PASS];

    // run speedline
    return artifacts.requestSpeedline(trace).then(speedline => {
      if (speedline.frames.length === 0) {
        throw new Error('Trace unable to find visual progress frames.');
      }

      if (speedline.speedIndex === 0) {
        throw new Error('Error in Speedline calculating Speed Index (speedIndex of 0).');
      }

      let visuallyReadyInMs = undefined;
      speedline.frames.forEach(frame => {
        if (frame.getPerceptualProgress() >= 85 && typeof visuallyReadyInMs === 'undefined') {
          visuallyReadyInMs = frame.getTimeStamp() - speedline.beginning;
        }
      });

      // Use the CDF of a log-normal distribution for scoring.
      //  10th Percentile = 2,240
      //  25th Percentile = 3,430
      //  Median = 5,500
      //  75th Percentile = 8,820
      //  95th Percentile = 17,400
      const distribution = TracingProcessor.getLogNormalDistribution(SCORING_MEDIAN,
        SCORING_POINT_OF_DIMINISHING_RETURNS);
      let score = 100 * distribution.computeComplementaryPercentile(speedline.perceptualSpeedIndex);

      // Clamp the score to 0 <= x <= 100.
      score = Math.min(100, score);
      score = Math.max(0, score);

      const extendedInfo = {
        timings: {
          firstVisualChange: speedline.first,
          visuallyReady: visuallyReadyInMs,
          visuallyComplete: speedline.complete,
          speedIndex: speedline.speedIndex,
          perceptualSpeedIndex: speedline.perceptualSpeedIndex
        },
        timestamps: {
          firstVisualChange: (speedline.first + speedline.beginning) * 1000,
          visuallyReady: (visuallyReadyInMs + speedline.beginning) * 1000,
          visuallyComplete: (speedline.complete + speedline.beginning) * 1000,
          speedIndex: (speedline.speedIndex + speedline.beginning) * 1000,
          perceptualSpeedIndex: (speedline.perceptualSpeedIndex + speedline.beginning) * 1000
        },
        frames: speedline.frames.map(frame => {
          return {
            timestamp: frame.getTimeStamp(),
            progress: frame.getPerceptualProgress()
          };
        })
      };

      return {
        score: Math.round(score),
        rawValue: Math.round(speedline.perceptualSpeedIndex),
        optimalValue: this.meta.optimalValue,
        extendedInfo: {
          formatter: Formatter.SUPPORTED_FORMATS.SPEEDLINE,
          value: extendedInfo
        }
      };
    });
  }
}

module.exports = SpeedIndexMetric;
