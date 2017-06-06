/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const getFilenamePrefix = require('../../../lighthouse-core/lib/file-namer').getFilenamePrefix;

class ExperimentDatabase {
  constructor() {
    this._fsRoot = fs.mkdtempSync(`${__dirname}/experiment-data-`);
    this._timeStamps = {};
  }

  get timeStamps() {
    return this._timeStamps;
  }

  get fsRoot() {
    return this._fsRoot;
  }

  /*
   * Save experiment data
   * @param {!Object} lhFlags
   * @param {!Object} lhResults
   */
  saveData(lhFlags, lhResults) {
    const id = getFilenamePrefix(lhResults);
    this._timeStamps[id] = lhResults.generatedTime;

    const dirPath = path.join(this._fsRoot, id);
    fs.mkdirSync(dirPath);
    fs.writeFileSync(path.join(dirPath, 'flags.json'), JSON.stringify(lhFlags));
    fs.writeFileSync(path.join(dirPath, 'results.json'), JSON.stringify(lhResults));
    return id;
  }

  /*
   * Get report.html
   * @param {string} id
   */
  getResults(id) {
    return JSON.parse(fs.readFileSync(path.join(this._fsRoot, id, 'results.json'), 'utf8'));
  }

  /*
   * Get flags.json
   * @param {string} id
   */
  getFlags(id) {
    return JSON.parse(fs.readFileSync(path.join(this._fsRoot, id, 'flags.json'), 'utf8'));
  }

  /*
   * Delete all the files created by this object
   */
  clear() {
    rimraf.sync(this._fsRoot);
  }
}

module.exports = ExperimentDatabase;
