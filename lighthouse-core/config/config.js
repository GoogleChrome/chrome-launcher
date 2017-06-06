/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const defaultConfigPath = './default.js';
const defaultConfig = require('./default.js');

const GatherRunner = require('../gather/gather-runner');
const log = require('../lib/log');
const path = require('path');
const Audit = require('../audits/audit');
const Runner = require('../runner');

const _flatten = arr => [].concat(...arr);

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
  const requiredGatherers = Config.getGatherersNeededByAudits(audits);

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

  // Passes must have unique `passName`s. Throw otherwise.
  const usedNames = new Set();
  let defaultUsed = false;
  passes.forEach((pass, index) => {
    let passName = pass.passName;
    if (!passName) {
      if (defaultUsed) {
        throw new Error(`passes[${index}] requires a passName`);
      }

      passName = Audit.DEFAULT_PASS;
      defaultUsed = true;
    }

    if (usedNames.has(passName)) {
      throw new Error(`Passes must have unique names (repeated passName: ${passName}.`);
    }
    usedNames.add(passName);
  });
}

function validateCategories(categories, audits, auditResults, groups) {
  if (!categories) {
    return;
  }

  const auditIds = audits ?
      audits.map(audit => audit.meta.name) :
      auditResults.map(audit => audit.name);
  Object.keys(categories).forEach(categoryId => {
    categories[categoryId].audits.forEach((audit, index) => {
      if (!audit.id) {
        throw new Error(`missing an audit id at ${categoryId}[${index}]`);
      }

      if (!auditIds.includes(audit.id)) {
        throw new Error(`could not find ${audit.id} audit for category ${categoryId}`);
      }

      if (categoryId === 'accessibility' && !audit.group) {
        throw new Error(`${audit.id} accessibility audit does not have a group`);
      }

      if (audit.group && !groups[audit.group]) {
        throw new Error(`${audit.id} references unknown group ${audit.group}`);
      }
    });
  });
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

  if (typeof auditDefinition.meta.helpText !== 'string') {
    throw new Error(
      `${auditName} has no meta.helpText property, or the property is not a string.`
    );
  }

  if (!Array.isArray(auditDefinition.meta.requiredArtifacts)) {
    throw new Error(
      `${auditName} has no meta.requiredArtifacts property, or the property is not an array.`
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

  if (artifacts.devtoolsLogs) {
    Object.keys(artifacts.devtoolsLogs).forEach(key => {
      artifacts.devtoolsLogs[key] = require(artifacts.devtoolsLogs[key]);
    });
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

    // Generate a limited config if specified
    if (configJSON.settings &&
        (Array.isArray(configJSON.settings.onlyCategories) ||
        Array.isArray(configJSON.settings.onlyAudits))) {
      const categoryIds = configJSON.settings.onlyCategories;
      const auditIds = configJSON.settings.onlyAudits;
      configJSON = Config.generateNewFilteredConfig(configJSON, categoryIds, auditIds);
    }

    // Store the directory of the config path, if one was provided.
    this._configDir = configPath ? path.dirname(configPath) : undefined;

    this._passes = configJSON.passes || null;
    this._auditResults = configJSON.auditResults || null;
    if (this._auditResults && !Array.isArray(this._auditResults)) {
      throw new Error('config.auditResults must be an array');
    }

    this._audits = Config.requireAudits(configJSON.audits, this._configDir);
    this._artifacts = expandArtifacts(configJSON.artifacts);
    this._categories = configJSON.categories;
    this._groups = configJSON.groups;

    // validatePasses must follow after audits are required
    validatePasses(configJSON.passes, this._audits, this._configDir);
    validateCategories(configJSON.categories, this._audits, this._auditResults, this._groups);
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
   * Filter out any unrequested items from the config, based on requested top-level categories.
   * @param {!Object} oldConfig Lighthouse config object
   * @param {!Array<string>=} categoryIds ID values of categories to include
   * @param {!Array<string>=} auditIds ID values of categories to include
   * @return {!Object} A new config
   */
  static generateNewFilteredConfig(oldConfig, categoryIds, auditIds) {
    // 0. Clone config to avoid mutating it
    const config = deepClone(oldConfig);
    // 1. Filter to just the chosen categories
    config.categories = Config.filterCategoriesAndAudits(config.categories, categoryIds, auditIds);

    // 2. Resolve which audits will need to run
    const requestedAuditNames = Config.getAuditIdsInCategories(config.categories);
    const auditPathToNameMap = Config.getMapOfAuditPathToName(config);
    config.audits = config.audits.filter(auditPath =>
        requestedAuditNames.has(auditPathToNameMap.get(auditPath)));

    // 3. Resolve which gatherers will need to run
    const auditObjectsSelected = Config.requireAudits(config.audits);
    const requiredGatherers = Config.getGatherersNeededByAudits(auditObjectsSelected);

    // 4. Filter to only the neccessary passes
    config.passes = Config.generatePassesNeededByGatherers(config.passes, requiredGatherers);
    return config;
  }

  /**
   * Filter out any unrequested categories or audits from the categories object.
   * @param {!Object<string, {audits: !Array<{id: string}>}>} categories
   * @param {!Array<string>=} categoryIds
   * @param {!Array<string>=} auditIds
   * @return {!Object<string, {audits: !Array<{id: string}>}>}
   */
  static filterCategoriesAndAudits(oldCategories, categoryIds = [], auditIds = []) {
    const categories = {};

    // warn if the category is not found
    categoryIds.forEach(categoryId => {
      if (!oldCategories[categoryId]) {
        log.warn('config', `unrecognized category in 'onlyCategories': ${categoryId}`);
      }
    });

    // warn if the audit is not found in a category
    auditIds.forEach(auditId => {
      const foundCategory = Object.keys(oldCategories).find(categoryId => {
        const audits = oldCategories[categoryId].audits;
        return audits.find(candidate => candidate.id === auditId);
      });

      if (!foundCategory) {
        log.warn('config', `unrecognized audit in 'onlyAudits': ${auditId}`);
      }

      if (categoryIds.includes(foundCategory)) {
        log.warn('config', `${auditId} in 'onlyAudits' is already included by ` +
            `${foundCategory} in 'onlyCategories'`);
      }
    });

    Object.keys(oldCategories).forEach(categoryId => {
      if (categoryIds.includes(categoryId)) {
        categories[categoryId] = oldCategories[categoryId];
      } else {
        const newCategory = deepClone(oldCategories[categoryId]);
        newCategory.audits = newCategory.audits.filter(audit => auditIds.includes(audit.id));
        if (newCategory.audits.length) {
          categories[categoryId] = newCategory;
        }
      }
    });

    return categories;
  }

  /**
   * Finds the unique set of audit IDs used by the categories object.
   * @param {!Object<string, {audits: !Array<{id: string}>}>} categories
   * @return {!Set<string>}
   */
  static getAuditIdsInCategories(categories) {
    const audits = _flatten(Object.keys(categories).map(id => categories[id].audits));
    return new Set(audits.map(audit => audit.id));
  }

 /**
  * @param {{categories: !Object<string, {name: string}>}} config
  * @return {!Array<{id: string, name: string}>}
  */
  static getCategories(config) {
    return Object.keys(config.categories).map(id => {
      const name = config.categories[id].name;
      return {id, name};
    });
  }

  /**
   * Creates mapping from audit path (used in config.audits) to audit.name (used in categories)
   * @param {!Object} config Lighthouse config object.
   * @return {Map}
   */
  static getMapOfAuditPathToName(config) {
    const auditObjectsAll = Config.requireAudits(config.audits);
    const auditPathToName = new Map(auditObjectsAll.map((AuditClass, index) => {
      const auditPath = config.audits[index];
      const auditName = AuditClass.meta.name;
      return [auditPath, auditName];
    }));
    return auditPathToName;
  }

  /**
   * From some requested audits, return names of all required artifacts
   * @param {!Object} audits
   * @return {!Set<string>}
   */
  static getGatherersNeededByAudits(audits) {
    // It's possible we weren't given any audits (but existing audit results), in which case
    // there is no need to do any work here.
    if (!audits) {
      return new Set();
    }

    return audits.reduce((list, audit) => {
      audit.meta.requiredArtifacts.forEach(artifact => list.add(artifact));
      return list;
    }, new Set());
  }

  /**
   * Filters to only required passes and gatherers, returning a new passes object
   * @param {!Object} oldPasses
   * @param {!Set<string>} requiredGatherers
   * @return {!Object} fresh passes object
   */
  static generatePassesNeededByGatherers(oldPasses, requiredGatherers) {
    const auditsNeedTrace = requiredGatherers.has('traces');
    const passes = JSON.parse(JSON.stringify(oldPasses));
    const filteredPasses = passes.map(pass => {
      // remove any unncessary gatherers from within the passes
      pass.gatherers = pass.gatherers.filter(gathererName => {
        gathererName = GatherRunner.getGathererClass(gathererName).name;
        return requiredGatherers.has(gathererName);
      });

      // disable the trace if no audit requires a trace
      if (pass.recordTrace && !auditsNeedTrace) {
        const passName = pass.passName || 'unknown pass';
        log.warn('config', `Trace not requested by an audit, dropping trace in ${passName}`);
        pass.recordTrace = false;
      }

      return pass;
    }).filter(pass => {
      // remove any passes lacking concrete gatherers, unless they are dependent on the trace
      if (pass.recordTrace) return true;
      return pass.gatherers.length > 0;
    });
    return filteredPasses;
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

  /** @type {Object<{audits: !Array<{id: string, weight: number}>}>} */
  get categories() {
    return this._categories;
  }

  /** @type {Object<string, {title: string, description: string}>|undefined} */
  get groups() {
    return this._groups;
  }
}

module.exports = Config;
