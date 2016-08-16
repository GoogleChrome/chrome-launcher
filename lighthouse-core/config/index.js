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

const defaultConfig = require('./default.json');
const recordsFromLogs = require('../lib/network-recorder').recordsFromLogs;
const CriticalRequestChainsGatherer = require('../gather/gatherers/critical-request-chains');
const SpeedlineGatherer = require('../gather/gatherers/speedline');

const GatherRunner = require('../gather/gather-runner');
const log = require('../lib/log');
const path = require('path');

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
  for (let dup of traceStartEvents) {
    traceEvents.splice(dup - i, 1);
    i++;
  }

  // Add a new TracingStartedInPage event based on most active thread
  // and using TS of first found TracingStartedIn* event
  traceEvents.unshift(makeMockEvent(mostActiveFrame, ts));

  return trace;
}

function filterPasses(passes, audits, paths) {
  const requiredGatherers = getGatherersNeededByAudits(audits);

  // Make sure we only have the gatherers that are needed by the audits
  // that have been listed in the config.
  const filteredPasses = passes.map(pass => {
    const freshPass = Object.assign({}, pass);

    freshPass.gatherers = freshPass.gatherers.filter(gatherer => {
      try {
        const GathererClass = GatherRunner.getGathererClass(gatherer, paths);
        return requiredGatherers.has(GathererClass.name);
      } catch (requireError) {
        throw new Error(`Unable to locate gatherer: ${gatherer}`);
      }
    });

    return freshPass;
  })

  // Now remove any passes which no longer have gatherers.
  .filter(p => p.gatherers.length > 0);
  return filteredPasses;
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

function filterAudits(audits, auditWhitelist) {
  // If there is no whitelist, assume all.
  if (!auditWhitelist) {
    return Array.from(audits);
  }

  const rejected = [];
  const filteredAudits = audits.filter(a => {
    const auditName = a.toLowerCase();
    const inWhitelist = auditWhitelist.has(auditName);

    if (!inWhitelist) {
      rejected.push(auditName);
    }

    return inWhitelist;
  });

  if (rejected.length) {
    log.log('info', 'Running these audits:', `${filteredAudits.join(', ')}`);
    log.log('info', 'Skipping these audits:', `${rejected.join(', ')}`);
  }

  return filteredAudits;
}

function expandAudits(audits, paths) {
  const rootPath = path.join(__dirname, '../../');

  return audits.map(audit => {
    // Check each path to see if the audit can be located. First match wins.
    const AuditClass = paths.reduce((definition, auditPath) => {
      // If the definition has already been found, just propagate it. Otherwise try a search
      // on the path in this iteration of the loop.
      if (definition !== null) {
        return definition;
      }

      const requirePath = auditPath.startsWith('/') ? auditPath : path.join(rootPath, auditPath);
      try {
        return require(`${requirePath}/${audit}`);
      } catch (requireError) {
        return null;
      }
    }, null);

    if (!AuditClass) {
      throw new Error(`Unable to locate audit: ${audit}`);
    }

    // Confirm that the audit appears valid.
    const auditValidation = validateAudit(AuditClass);
    if (!auditValidation.valid) {
      const errors = Object.keys(auditValidation)
          .reduce((errorList, item) => {
            // Ignore the valid property as it's generated from the other items in the object.
            if (item === 'valid') {
              return errorList;
            }

            return errorList + (auditValidation[item] ? '' : `\n - ${item} is missing`);
          }, '');

      throw new Error(`Invalid audit class: ${errors}`);
    }

    return AuditClass;
  });
}

function validateAudit(auditDefinition) {
  const hasAuditMethod = typeof auditDefinition.audit === 'function';
  const hasMeta = typeof auditDefinition.meta === 'object';
  const hasMetaName = hasMeta && typeof auditDefinition.meta.name !== 'undefined';
  const hasMetaCategory = hasMeta && typeof auditDefinition.meta.category !== 'undefined';
  const hasMetaDescription = hasMeta && typeof auditDefinition.meta.description !== 'undefined';
  const hasMetaRequiredArtifacts = hasMeta && Array.isArray(auditDefinition.meta.requiredArtifacts);
  const hasGenerateAuditResult = typeof auditDefinition.generateAuditResult === 'function';

  return {
    'valid': (
      hasAuditMethod &&
      hasMeta &&
      hasMetaName &&
      hasMetaCategory &&
      hasMetaDescription &&
      hasMetaRequiredArtifacts &&
      hasGenerateAuditResult
    ),
    'audit()': hasAuditMethod,
    'meta property': hasMeta,
    'meta.name property': hasMetaName,
    'meta.category property': hasMetaCategory,
    'meta.description property': hasMetaDescription,
    'meta.requiredArtifacts array': hasMetaRequiredArtifacts,
    'generateAuditResult()': hasGenerateAuditResult
  };
}

function expandArtifacts(artifacts, includeSpeedline) {
  const expandedArtifacts = Object.assign({}, artifacts);

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

      expandedArtifacts.traces[key] = trace;
    });
  }

  if (includeSpeedline) {
    const speedline = new SpeedlineGatherer();
    speedline.afterPass({}, {traceEvents: expandedArtifacts.traces.defaultPass.traceEvents});
    expandedArtifacts.Speedline = speedline.artifact;
  }

  if (artifacts.performanceLog) {
    expandedArtifacts.CriticalRequestChains =
      parsePerformanceLog(require(artifacts.performanceLog));
  }

  return expandedArtifacts;
}

function parsePerformanceLog(logs) {
  // Parse logs for network events
  const networkRecords = recordsFromLogs(logs);

  // Use critical request chains gatherer to create the critical request chains artifact
  const criticalRequestChainsGatherer = new CriticalRequestChainsGatherer();
  criticalRequestChainsGatherer.afterPass({}, {networkRecords});

  return criticalRequestChainsGatherer.artifact;
}

/**
 * @return {!Config}
 */
class Config {
  /**
   * @constructor
   * @param{Object} config
   */
  constructor(configJSON, auditWhitelist) {
    if (!configJSON) {
      configJSON = defaultConfig;
    }

    this._configJSON = this._initRequirePaths(configJSON);

    this._audits = this.json.audits ? expandAudits(
        filterAudits(this.json.audits, auditWhitelist), this.json.paths.audits
        ) : null;
    // filterPasses expects audits to have been expanded
    this._passes = this.json.passes ?
        filterPasses(this.json.passes, this._audits, this.json.paths.gatherers) :
        null;
    this._auditResults = this.json.auditResults ? Array.from(this.json.auditResults) : null;
    this._artifacts = null;
    if (this.json.artifacts) {
      this._artifacts = expandArtifacts(this.json.artifacts,
          // If time-to-interactive is present, add the speedline artifact
          this.json.audits && this.json.audits.find(a => a === 'time-to-interactive'));
    }
    this._aggregations = this.json.aggregations ? Array.from(this.json.aggregations) : null;
  }

  _initRequirePaths(configJSON) {
    if (typeof configJSON.paths !== 'object') {
      configJSON.paths = {};
    }

    if (!Array.isArray(configJSON.paths.audits)) {
      configJSON.paths.audits = [];
    }

    if (!Array.isArray(configJSON.paths.gatherers)) {
      configJSON.paths.gatherers = [];
    }

    // Make sure the default paths are prepended to the list
    if (configJSON.paths.audits.indexOf('lighthouse-core/audits') === -1) {
      configJSON.paths.audits.unshift('lighthouse-core/audits');
    }

    if (configJSON.paths.gatherers.indexOf('lighthouse-core/gather/gatherers') === -1) {
      configJSON.paths.gatherers.unshift('lighthouse-core/gather/gatherers');
    }

    return configJSON;
  }

  /** @type {!Object} */
  get json() {
    return this._configJSON;
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
