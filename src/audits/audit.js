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

class Audit {
  /**
   * @return {!Array<string>}
   */
  static get tags() {
    throw new Error('Audit tags must be overridden');
  }

  /**
   * @return {string}
   */
  static get name() {
    throw new Error('Audit name must be overridden');
  }

  /**
   * @return {string}
   */
  static get description() {
    throw new Error('Audit description must be overridden');
  }

  /**
   * @return {?(boolean|number|string|undefined)}
   */
  static get optimalValue() {
    return undefined;
  }

  /**
   * @param {!AuditResultInput} result
   * @return {!AuditResult}
   */
  static generateAuditResult(result) {
    if (typeof result.value === 'undefined') {
      throw new Error('generateAuditResult requires a value');
    }

    return {
      value: result.value,
      rawValue: result.rawValue,
      debugString: result.debugString,
      optimalValue: result.optimalValue,
      extendedInfo: result.extendedInfo,
      name: this.name,
      tags: this.tags,
      description: this.description
    };
  }
}

module.exports = Audit;
