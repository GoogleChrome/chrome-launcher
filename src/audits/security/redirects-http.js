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

const Audit = require('../audit');

class RedirectsHTTP extends Audit {
  /**
   * @override
   */
  static get tags() {
    return ['Security'];
  }

  /**
   * @override
   */
  static get name() {
    return 'redirects-http';
  }

  /**
   * @override
   */
  static get description() {
    return 'Site redirects HTTP traffic to HTTPS';
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    return RedirectsHTTP.generateAuditResult({
      value: artifacts.redirectsHTTP.value,
      debugString: artifacts.redirectsHTTP.debugString
    });
  }
}

module.exports = RedirectsHTTP;
