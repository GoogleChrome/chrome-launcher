/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const log = require('../../../lighthouse-core/lib/log.js');

/**
 * @param {!Object} object
 * @param {string} path
 * @return {*}
 */
function safeGet(object, path) {
  const components = path.split('.');
  for (const component of components) {
    if (!object) {
      return null;
    }
    object = object[component];
  }
  return object;
}

class Metrics {
  constructor(traceEvents, auditResults) {
    this._traceEvents = traceEvents;
    this._auditResults = auditResults;
  }

  /**
   * Returns simplified representation of all metrics
   * @return {!Array<{getTs: Function, id: string, name: string}>} metrics to consider
   */
  static get metricsDefinitions() {
    return [
      {
        name: 'Navigation Start',
        id: 'navstart',
        getTs: auditResults => {
          const fmpExt = auditResults['first-meaningful-paint'].extendedInfo;
          return safeGet(fmpExt, 'value.timestamps.navStart');
        },
        getTiming: auditResults => {
          const fmpExt = auditResults['first-meaningful-paint'].extendedInfo;
          return safeGet(fmpExt, 'value.timings.navStart');
        }
      },
      {
        name: 'First Contentful Paint',
        id: 'ttfcp',
        getTs: auditResults => {
          const fmpExt = auditResults['first-meaningful-paint'].extendedInfo;
          return safeGet(fmpExt, 'value.timestamps.fCP');
        },
        getTiming: auditResults => {
          const fmpExt = auditResults['first-meaningful-paint'].extendedInfo;
          return safeGet(fmpExt, 'value.timings.fCP');
        }
      },
      {
        name: 'First Meaningful Paint',
        id: 'ttfmp',
        getTs: auditResults => {
          const fmpExt = auditResults['first-meaningful-paint'].extendedInfo;
          return safeGet(fmpExt, 'value.timestamps.fMP');
        },
        getTiming: auditResults => {
          const fmpExt = auditResults['first-meaningful-paint'].extendedInfo;
          return safeGet(fmpExt, 'value.timings.fMP');
        }
      },
      {
        name: 'Perceptual Speed Index',
        id: 'psi',
        getTs: auditResults => {
          const siExt = auditResults['speed-index-metric'].extendedInfo;
          return safeGet(siExt, 'value.timestamps.perceptualSpeedIndex');
        },
        getTiming: auditResults => {
          const siExt = auditResults['speed-index-metric'].extendedInfo;
          return safeGet(siExt, 'value.timings.perceptualSpeedIndex');
        }
      },
      {
        name: 'First Visual Change',
        id: 'fv',
        getTs: auditResults => {
          const siExt = auditResults['speed-index-metric'].extendedInfo;
          return safeGet(siExt, 'value.timestamps.firstVisualChange');
        },
        getTiming: auditResults => {
          const siExt = auditResults['speed-index-metric'].extendedInfo;
          return safeGet(siExt, 'value.timings.firstVisualChange');
        }
      },
      {
        name: 'Visually Complete 85%',
        id: 'vc85',
        getTs: auditResults => {
          const siExt = auditResults['speed-index-metric'].extendedInfo;
          return safeGet(siExt, 'value.timestamps.visuallyReady');
        },
        getTiming: auditResults => {
          const siExt = auditResults['speed-index-metric'].extendedInfo;
          return safeGet(siExt, 'value.timings.visuallyReady');
        }
      },
      {
        name: 'Visually Complete 100%',
        id: 'vc100',
        getTs: auditResults => {
          const siExt = auditResults['speed-index-metric'].extendedInfo;
          return safeGet(siExt, 'value.timestamps.visuallyComplete');
        },
        getTiming: auditResults => {
          const siExt = auditResults['speed-index-metric'].extendedInfo;
          return safeGet(siExt, 'value.timings.visuallyComplete');
        }
      },
      {
        name: 'Time to Interactive (vAlpha)',
        id: 'tti',
        getTs: auditResults => {
          const ttiExt = auditResults['time-to-interactive'].extendedInfo;
          return safeGet(ttiExt, 'value.timestamps.timeToInteractive');
        },
        getTiming: auditResults => {
          const ttiExt = auditResults['time-to-interactive'].extendedInfo;
          return safeGet(ttiExt, 'value.timings.timeToInteractive');
        }
      },
      {
        name: 'First Interactive (vBeta)',
        id: 'ttfi',
        getTs: auditResults => {
          const ttfiExt = auditResults['first-interactive'].extendedInfo;
          return safeGet(ttfiExt, 'value.timestamp');
        },
        getTiming: auditResults => {
          const ttfiExt = auditResults['first-interactive'].extendedInfo;
          return safeGet(ttfiExt, 'value.timeInMs');
        }
      },
      {
        name: 'Time to Consistently Interactive (vBeta)',
        id: 'ttci',
        getTs: auditResults => {
          const ttiExt = auditResults['consistently-interactive'].extendedInfo;
          return safeGet(ttiExt, 'value.timestamp');
        },
        getTiming: auditResults => {
          const ttiExt = auditResults['consistently-interactive'].extendedInfo;
          return safeGet(ttiExt, 'value.timeInMs');
        }
      },
      {
        name: 'End of Trace',
        id: 'eot',
        getTs: auditResults => {
          const ttiExt = auditResults['first-meaningful-paint'].extendedInfo;
          return safeGet(ttiExt, 'value.timestamps.endOfTrace');
        },
        getTiming: auditResults => {
          const ttiExt = auditResults['first-meaningful-paint'].extendedInfo;
          return safeGet(ttiExt, 'value.timings.endOfTrace');
        }
      },
      {
        name: 'On Load',
        id: 'onload',
        getTs: auditResults => {
          const ttiExt = auditResults['first-meaningful-paint'].extendedInfo;
          return safeGet(ttiExt, 'value.timestamps.onLoad');
        },
        getTiming: auditResults => {
          const ttiExt = auditResults['first-meaningful-paint'].extendedInfo;
          return safeGet(ttiExt, 'value.timings.onLoad');
        }
      }
    ];
  }

  /**
   * Returns simplified representation of all metrics' timestamps from monotonic clock
   * @return {!Array<{ts: number, id: string, name: string}>} metrics to consider
   */
  gatherMetrics() {
    const metricDfns = Metrics.metricsDefinitions;
    const resolvedMetrics = [];
    metricDfns.forEach(metric => {
      // try/catch in case auditResults is missing a particular audit result
      try {
        resolvedMetrics.push({
          id: metric.id,
          name: metric.name,
          ts: metric.getTs(this._auditResults),
        });
      } catch (e) {
        log.error('pwmetrics-events', `${metric.name} timestamp not found: ${e.message}`);
      }
    });
    return resolvedMetrics;
  }

  /**
   * Get the full trace event for our navigationStart
   * @param {!Array<{ts: number, id: string, name: string}>} metrics
   */
  identifyNavigationStartEvt(metrics) {
    const navStartMetric = metrics.find(e => e.id === 'navstart');
    if (!navStartMetric) return;
    this._navigationStartEvt = this._traceEvents.find(
      e => e.name === 'navigationStart' && e.ts === navStartMetric.ts
    );
  }

  /**
   * Constructs performance.measure trace events, which have start/end events as follows:
   *     { "pid": 89922,"tid":1295,"ts":77176783452,"ph":"b","cat":"blink.user_timing","name":"innermeasure","args":{},"tts":1257886,"id":"0xe66c67"}
   *     { "pid": 89922,"tid":1295,"ts":77176882592,"ph":"e","cat":"blink.user_timing","name":"innermeasure","args":{},"tts":1257898,"id":"0xe66c67"}
   * @param {{ts: number, id: string, name: string}} metric
   * @return {!Array} Pair of trace events (start/end)
   */
  synthesizeEventPair(metric) {
    // We'll masquerade our fake events to look mostly like navigationStart
    const eventBase = {
      pid: this._navigationStartEvt.pid,
      tid: this._navigationStartEvt.tid,
      cat: 'blink.user_timing',
      name: metric.name,
      args: {},
      // randomized id is same for the pair
      id: `0x${((Math.random() * 1000000) | 0).toString(16)}`,
    };
    const fakeMeasureStartEvent = Object.assign({}, eventBase, {
      ts: this._navigationStartEvt.ts,
      ph: 'b',
    });
    const fakeMeasureEndEvent = Object.assign({}, eventBase, {
      ts: metric.ts,
      ph: 'e',
    });
    return [fakeMeasureStartEvent, fakeMeasureEndEvent];
  }

  /**
   * @returns {!Array} User timing raw trace event pairs
   */
  generateFakeEvents() {
    const fakeEvents = [];
    const metrics = this.gatherMetrics();
    if (metrics.length === 0) {
      log.error('metrics-events', 'Metrics collection had errors, not synthetizing trace events');
      return [];
    }

    this.identifyNavigationStartEvt(metrics);
    if (!this._navigationStartEvt) {
      log.error('pwmetrics-events', 'Reference navigationStart not found');
      return [];
    }

    metrics.forEach(metric => {
      if (metric.id === 'navstart') {
        return;
      }
      if (!metric.ts) {
        log.error('pwmetrics-events', `(${metric.name}) missing timestamp. Skipping…`);
        return;
      }
      log.verbose('pwmetrics-events', `Sythesizing trace events for ${metric.name}`);
      fakeEvents.push(...this.synthesizeEventPair(metric));
    });
    return fakeEvents;
  }
}

module.exports = Metrics;
