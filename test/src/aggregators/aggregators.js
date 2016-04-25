/**
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
const assert = require('assert');
const walk = require('walk');
const path = require('path');

const walkTree = new Promise((resolve, reject) => {
  const fullFilePath = path.join(__dirname, '../../src/aggregators/');
  const walker = walk.walk(fullFilePath);
  const aggregators = [];

  walker.on('file', (root, fileStats, next) => {
    if (fileStats.name === 'aggregate.js' || !fileStats.name.endsWith('.js')) {
      return next();
    }

    aggregators.push(require(root + '/' + fileStats.name));
    next();
  });

  walker.on('end', () => {
    resolve(aggregators);
  });
});

/* global describe, it*/

describe('Aggregators', () => {
  it('has no aggregators failing when name is called', () => {
    return walkTree.then(aggregators => {
      aggregators.forEach(aggregator => {
        assert.doesNotThrow(_ => aggregator.name);
      });
    });
  });

  it('has no aggregators failing when shortName is called', () => {
    return walkTree.then(aggregators => {
      aggregators.forEach(aggregator => {
        assert.doesNotThrow(_ => aggregator.shortName);
      });
    });
  });

  it('has no aggregators failing when criteria is called', () => {
    return walkTree.then(aggregators => {
      aggregators.forEach(aggregator => {
        assert.doesNotThrow(_ => aggregator.criteria);
      });
    });
  });
});
