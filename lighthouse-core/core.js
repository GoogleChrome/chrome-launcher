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

class Core {
  static audit(artifacts, audits) {
    audits = this.expandAudits(audits);

    return Promise.all(audits.map(audit => audit.audit(artifacts)));
  }

  static expandAudits(audits) {
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
    return audits.filter(a => {
      // If there is no whitelist, assume all.
      if (!whitelist) {
        return true;
      }

      return whitelist.has(a.toLowerCase());
    });
  }
}

module.exports = Core;
