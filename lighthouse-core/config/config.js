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

const defaultConfigPath = './default.json';
const defaultConfig = require('./default.json');
const recordsFromLogs = require('../lib/network-recorder').recordsFromLogs;

const GatherRunner = require('../gather/gather-runner');
const log = require('../lib/log');
const path = require('path');
const Audit = require('../audits/audit');
const Runner = require('../runner');

// cleanTrace is run to remove duplicate TracingStartedInPage events,
// and to change TracingStartedInBrowser events into TracingStartedInPage.
// This is done by searching for most occuring threads and basing new events
// off of those.
function cleanTrace(trace) {
  const traceEvents = trace.traceEvents;
  // Keep track of most occuring threads
  const threads = [];
  const countsByThread = {};
  const traceStartEvents = [];
  const makeMockEvent = (evt, ts) => {
    return {
      pid: evt.pid,
      tid: evt.tid,
      ts: ts || 0,  // default to 0 for now
      ph: 'I',
      cat: 'disabled-by-default-devtools.timeline',
      name: 'TracingStartedInPage',
      args: {
        data: {
          page: evt.frame
        }
      },
      s: 't'
    };
  };

  let frame;
  let data;
  let name;
  let counter;

  traceEvents.forEach((evt, idx) => {
    if (evt.name.startsWith('TracingStartedIn')) {
      traceStartEvents.push(idx);
    }

    // find the event's frame
    data = evt.args && (evt.args.data || evt.args.beginData || evt.args.counters);
    frame = (evt.args && evt.args.frame) || data && (data.frame || data.page);

    if (!frame) {
      return;
    }

    // Increase occurences count of the frame
    name = `pid${evt.pid}-tid${evt.tid}-frame${frame}`;
    counter = countsByThread[name];
    if (!counter) {
      counter = {
        pid: evt.pid,
        tid: evt.tid,
        frame: frame,
        count: 0
      };
      countsByThread[name] = counter;
      threads.push(counter);
    }
    counter.count++;
  });

  // find most active thread (and frame)
  threads.sort((a, b) => b.count - a.count);
  const mostActiveFrame = threads[0];

  // Remove all current TracingStartedIn* events, storing
  // the first events ts.
  const ts = traceEvents[traceStartEvents[0]] && traceEvents[traceStartEvents[0]].ts;

  // account for offset after removing items
  let i = 0;
  for (const dup of traceStartEvents) {
    traceEvents.splice(dup - i, 1);
    i++;
  }

  // Add a new TracingStartedInPage event based on most active thread
  // and using TS of first found TracingStartedIn* event
  traceEvents.unshift(makeMockEvent(mostActiveFrame, ts));

  return trace;
}

function validatePasses(passes, audits, rootPath) {
  if (!Array.isArray(passes)) {
    return;
  }
  const requiredGatherers = getGatherersNeededByAudits(audits);

  // Log if we are running gathers that are not needed by the audits listed in the config
  passes.forEach(pass => {
    pass.gatherers.forEach(gatherer => {
      const GathererClass = GatherRunner.getGathererClass(gatherer, rootPath);
      const isGatherRequiredByAudits = requiredGatherers.has(GathererClass.name);
      if (isGatherRequiredByAudits === false) {
        const msg = `${GathererClass.name} gatherer requested, however no audit requires it.`;
        log.warn('config', msg);
      }
    });
  });

  // Log if multiple passes require trace or network recording and could overwrite one another.
  const usedNames = new Set();
  passes.forEach((pass, index) => {
    if (!pass.recordNetwork && !pass.recordTrace) {
      return;
    }

    const passName = pass.passName || Audit.DEFAULT_PASS;
    if (usedNames.has(passName)) {
      log.warn('config', `passes[${index}] may overwrite trace or network ` +
          `data of earlier pass without a unique passName (repeated name: ${passName}.`);
    }
    usedNames.add(passName);
  });
}

function getGatherersNeededByAudits(audits) {
  // It's possible we didn't get given any audits (but existing audit results), in which case
  // there is no need to do any work here.
  if (!audits) {
    return new Set();
  }

  return audits.reduce((list, audit) => {
    audit.meta.requiredArtifacts.forEach(artifact => list.add(artifact));
    return list;
  }, new Set());
}

function assertValidAudit(auditDefinition, auditPath) {
  const auditName = auditPath || auditDefinition.meta.name;

  if (typeof auditDefinition.audit !== 'function') {
    throw new Error(`${auditName} has no audit() method.`);
  }

  if (typeof auditDefinition.meta.name !== 'string') {
    throw new Error(`${auditName} has no meta.name property, or the property is not a string.`);
  }

  if (typeof auditDefinition.meta.category !== 'string') {
    throw new Error(`${auditName} has no meta.category property, or the property is not a string.`);
  }

  if (typeof auditDefinition.meta.description !== 'string') {
    throw new Error(
      `${auditName} has no meta.description property, or the property is not a string.`
    );
  }

  if (!Array.isArray(auditDefinition.meta.requiredArtifacts)) {
    throw new Error(
      `${auditName} has no meta.requiredArtifacts property, or the property is not an array.`
    );
  }

  if (typeof auditDefinition.generateAuditResult !== 'function') {
    throw new Error(
      `${auditName} has no generateAuditResult() method. ` +
        'Did you inherit from the proper base class?'
    );
  }
}

function expandArtifacts(artifacts) {
  if (!artifacts) {
    return null;
  }
  // currently only trace logs and performance logs should be imported
  if (artifacts.traces) {
    Object.keys(artifacts.traces).forEach(key => {
      log.log('info', 'Normalizng trace contents into expected state...');
      let trace = require(artifacts.traces[key]);
      // Before Chrome 54.0.2816 (codereview.chromium.org/2161583004), trace was
      // an array of trace events. After this point, trace is an object with a
      // traceEvents property. Normalize to new format.
      if (Array.isArray(trace)) {
        trace = {
          traceEvents: trace
        };
      }
      trace = cleanTrace(trace);

      artifacts.traces[key] = trace;
    });
  }

  if (artifacts.performanceLog) {
    if (typeof artifacts.performanceLog === 'string') {
      // Support older format of a single performance log.
      const log = require(artifacts.performanceLog);
      artifacts.networkRecords = {
        [Audit.DEFAULT_PASS]: recordsFromLogs(log)
      };
    } else {
      artifacts.networkRecords = {};
      Object.keys(artifacts.performanceLog).forEach(key => {
        const log = require(artifacts.performanceLog[key]);
        artifacts.networkRecords[key] = recordsFromLogs(log);
      });
    }
  }

  return artifacts;
}

function merge(base, extension) {
  if (typeof base === 'undefined') {
    return extension;
  } else if (Array.isArray(extension)) {
    if (!Array.isArray(base)) throw new TypeError(`Expected array but got ${typeof base}`);
    return base.concat(extension);
  } else if (typeof extension === 'object') {
    if (typeof base !== 'object') throw new TypeError(`Expected object but got ${typeof base}`);
    Object.keys(extension).forEach(key => {
      base[key] = merge(base[key], extension[key]);
    });
    return base;
  }

  return extension;
}

function deepClone(json) {
  return JSON.parse(JSON.stringify(json));
}

class Config {
  /**
   * @constructor
   * @param {!LighthouseConfig} configJSON
   * @param {string=} configPath The absolute path to the config file, if there is one.
   */
  constructor(configJSON, configPath) {
    if (!configJSON) {
      configJSON = defaultConfig;
      configPath = path.resolve(__dirname, defaultConfigPath);
    }

    if (configPath && !path.isAbsolute(configPath)) {
      throw new Error('configPath must be an absolute path.');
    }

    // We don't want to mutate the original config object
    const inputConfig = configJSON;
    configJSON = deepClone(configJSON);

    // Copy arrays that could contain plugins to allow for programmatic
    // injection of plugins.
    if (Array.isArray(inputConfig.passes)) {
      configJSON.passes.forEach((pass, i) => {
        pass.gatherers = Array.from(inputConfig.passes[i].gatherers);
      });
    }
    if (Array.isArray(inputConfig.audits)) {
      configJSON.audits = Array.from(inputConfig.audits);
    }

    // Extend the default config if specified
    if (configJSON.extends) {
      configJSON = Config.extendConfigJSON(deepClone(defaultConfig), configJSON);
    }

    // Store the directory of the config path, if one was provided.
    this._configDir = configPath ? path.dirname(configPath) : undefined;

    this._passes = configJSON.passes || null;
    this._auditResults = configJSON.auditResults || null;
    if (this._auditResults && !Array.isArray(this._auditResults)) {
      throw new Error('config.auditResults must be an array');
    }

    this._aggregations = configJSON.aggregations || null;

    this._audits = Config.requireAudits(configJSON.audits, this._configDir);
    this._artifacts = expandArtifacts(configJSON.artifacts);

    // validatePasses must follow after audits are required
    validatePasses(configJSON.passes, this._audits, this._configDir);
  }

  /**
   * @param {!Object} baseJSON The JSON of the configuration to extend
   * @param {!Object} extendJSON The JSON of the extensions
   * @return {!Object}
   */
  static extendConfigJSON(baseJSON, extendJSON) {
    if (extendJSON.passes) {
      extendJSON.passes.forEach(pass => {
        const basePass = baseJSON.passes.find(candidate => candidate.passName === pass.passName);
        if (!basePass || !pass.passName) {
          baseJSON.passes.push(pass);
        } else {
          merge(basePass, pass);
        }
      });

      delete extendJSON.passes;
    }

    return merge(baseJSON, extendJSON);
  }

  /**
   * Take an array of audits and audit paths and require any paths (possibly
   * relative to the optional `configPath`) using `Runner.resolvePlugin`,
   * leaving only an array of Audits.
   * @param {?Array<(string|!Audit)>} audits
   * @param {string=} configPath
   * @return {?Array<!Audit>}
   */
  static requireAudits(audits, configPath) {
    if (!audits) {
      return null;
    }

    const coreList = Runner.getAuditList();
    return audits.map(pathOrAuditClass => {
      let AuditClass;
      if (typeof pathOrAuditClass === 'string') {
        const path = pathOrAuditClass;
        // See if the audit is a Lighthouse core audit.
        const coreAudit = coreList.find(a => a === `${path}.js`);
        let requirePath = `../audits/${path}`;
        if (!coreAudit) {
          // Otherwise, attempt to find it elsewhere. This throws if not found.
          requirePath = Runner.resolvePlugin(path, configPath, 'audit');
        }
        AuditClass = require(requirePath);
        assertValidAudit(AuditClass, path);
      } else {
        AuditClass = pathOrAuditClass;
        assertValidAudit(AuditClass);
      }

      return AuditClass;
    });
  }

  /** @type {string} */
  get configDir() {
    return this._configDir;
  }

  /** @type {Array<!Pass>} */
  get passes() {
    return this._passes;
  }

  /** @type {Array<!Audit>} */
  get audits() {
    return this._audits;
  }

  /** @type {Array<!AuditResult>} */
  get auditResults() {
    return this._auditResults;
  }

  /** @type {Array<!Artifacts>} */
  get artifacts() {
    return this._artifacts;
  }

  /** @type {Array<!Aggregation>} */
  get aggregations() {
    return this._aggregations;
  }
}

module.exports = Config;
