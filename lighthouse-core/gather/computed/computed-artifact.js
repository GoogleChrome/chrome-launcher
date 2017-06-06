/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

class ComputedArtifact {
  /**
   * @param {!ComputedArtifacts} allComputedArtifacts
   */
  constructor(allComputedArtifacts) {
    /** @private {!Map} */
    this._cache = new Map();

    /** @private {!ComputedArtifacts} */
    this._allComputedArtifacts = allComputedArtifacts;
  }

  /* eslint-disable no-unused-vars */

  /**
   * Override to implement a computed artifact. Can return a Promise or the
   * computed artifact itself.
   * @param {*} artifact Input to computation.
   * @param {!ComputedArtifacts} allComputedArtifacts Access to all computed artifacts.
   * @return {*}
   * @throws {Error}
   */
  compute_(artifact, allComputedArtifacts) {
    throw new Error('compute_() not implemented for computed artifact ' + this.name);
  }

  /* eslint-enable no-unused-vars */

  /**
   * Request a computed artifact, caching the result on the input artifact.
   * @param {*} artifact
   * @return {!Promise<*>}
   */
  request(artifact) {
    if (this._cache.has(artifact)) {
      return Promise.resolve(this._cache.get(artifact));
    }

    const artifactPromise = Promise.resolve()
      .then(_ => this.compute_(artifact, this._allComputedArtifacts));
    this._cache.set(artifact, artifactPromise);

    return artifactPromise;
  }
}

module.exports = ComputedArtifact;
