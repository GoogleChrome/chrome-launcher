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
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      get category() {
        throw new Error('Audit category must be overridden');
      },
      get name() {
        throw new Error('Audit name must be overridden');
      },
      get description() {
        throw new Error('Audit description must be overridden');
      },
      get optimalValue() {
        return undefined;
      },
      get requiredArtifacts() {
        throw new Error('Audit requiredArtifacts must be overriden.');
      }
    };
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
      name: this.meta.name,
      category: this.meta.category,
      description: this.meta.description
    };
  }
}

module.exports = Audit;
