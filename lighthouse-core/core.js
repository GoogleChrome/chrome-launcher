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

const log = require('./lib/log');

/**
 * The relationship between these root modules:
 *
 *   core.js   - the gathering, auditing and aggregation
 *   runner.js - the shared handler (for both module & extension) that needs to be given a driver,
 *               and sets up the core to do its job
 *   index.js  - the require('lighthouse') hook for Node modules (including the CLI)
 *
 *   lighthouse-cli \
 *                   -- index.js  \
 *                                 ----- runner.js ----> core.js [Gather / Audit / Aggregate]
 *           lighthouse-extension /
 *
 */

class Core {
  static audit(artifacts, audits) {
    audits = this.expandAudits(audits);

    return Promise.all(audits.map(audit => audit.audit(artifacts)));
  }

  static expandAudits(audits) {
    // It's possible we didn't get given any audits (but existing audit results), in which case
    // there is no need to do any expansion work.
    if (!audits) {
      return;
    }

    return audits.map(audit => {
      // If this is already instantiated, don't do anything else.
      if (typeof audit !== 'string') {
        return audit;
      }

      try {
        return require(`./audits/${audit}`);
      } catch (requireError) {
        throw new Error(`Unable to locate audit: ${audit}`);
      }
    });
  }

  static filterAudits(audits, whitelist) {
    // It's possible we didn't get given any audits (but existing audit results), in which case
    // there is no need to do any filter work.
    if (!audits) {
      return;
    }

    const rejected = [];
    const filteredAudits = audits.filter(a => {
      // If there is no whitelist, assume all.
      if (!whitelist) {
        return true;
      }

      const auditName = a.toLowerCase();
      const inWhitelist = whitelist.has(auditName);

      if (!inWhitelist) {
        rejected.push(auditName);
      }

      return inWhitelist;
    });

    if (rejected.length) {
      log.log('Running these audits:', `${filteredAudits.join(', ')}`);
      log.log('Skipping these audits:', `${rejected.join(', ')}`);
    }

    return filteredAudits;
  }
}

module.exports = Core;

