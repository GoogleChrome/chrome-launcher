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

class ComputedArtifact {
  constructor() {
    this.cache = new Map();
  }

  /* eslint-disable no-unused-vars */

  /**
   * Override to implement a computed artifact. Can return a Promise or the
   * computed artifact itself.
   * @param {!Object} artifact Input to computation.
   * @throws {Error}
   */
  compute_(artifact) {
    throw new Error('compute_() not implemented for computed artifact ' + this.name);
  }

  /* eslint-enable no-unused-vars */

  /**
   * Request a computed artifact, caching the result on the input artifact.
   * @param {!OBject} artifact
   * @return {!Promise}
   */
  request(artifact) {
    if (this.cache.has(artifact)) {
      return Promise.resolve(this.cache.get(artifact));
    }

    return Promise.resolve().then(_ => this.compute_(artifact)).then(computedArtifact => {
      this.cache.set(artifact, computedArtifact);
      return computedArtifact;
    });
  }
}

module.exports = ComputedArtifact;
