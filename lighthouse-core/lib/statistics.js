/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Approximates the Gauss error function, the probability that a random variable
 * from the standard normal distribution lies within [-x, x]. Moved from
 * traceviewer.b.math.erf, based on Abramowitz and Stegun, formula 7.1.26.
 * @param {number} x
 * @return {number}
 */
function erf(x) {
  // erf(-x) = -erf(x);
  const sign = Math.sign(x);
  x = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
  return sign * (1 - y * Math.exp(-x * x));
}

/**
 * Creates a log-normal distribution à la traceviewer's statistics package.
 * Specified by providing the median value, at which the score will be 0.5,
 * and the falloff, the initial point of diminishing returns where any
 * improvement in value will yield increasingly smaller gains in score. Both
 * values should be in the same units (e.g. milliseconds). See
 *   https://www.desmos.com/calculator/tx1wcjk8ch
 * for an interactive view of the relationship between these parameters and
 * the typical parameterization (location and shape) of the log-normal
 * distribution.
 * @param {number} median
 * @param {number} falloff
 * @return {{computeComplementaryPercentile: function(number): number}}
 */
function getLogNormalDistribution(median, falloff) {
  const location = Math.log(median);

  // The "falloff" value specified the location of the smaller of the positive
  // roots of the third derivative of the log-normal CDF. Calculate the shape
  // parameter in terms of that value and the median.
  const logRatio = Math.log(falloff / median);
  const shape = Math.sqrt(1 - 3 * logRatio - Math.sqrt((logRatio - 3) * (logRatio - 3) - 8)) / 2;

  return {
    computeComplementaryPercentile(x) {
      const standardizedX = (Math.log(x) - location) / (Math.SQRT2 * shape);
      return (1 - erf(standardizedX)) / 2;
    }
  };
}

module.exports = {
  getLogNormalDistribution
};
