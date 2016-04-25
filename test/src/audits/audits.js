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
  const fullFilePath = path.join(__dirname, '../../audits/');
  const walker = walk.walk(fullFilePath);
  const audits = [];

  walker.on('file', (root, fileStats, next) => {
    if (fileStats.name === 'audit.js' || !fileStats.name.endsWith('.js')) {
      return next();
    }

    audits.push(require(root + '/' + fileStats.name));
    next();
  });

  walker.on('end', () => {
    resolve(audits);
  });
});

/* global describe, it*/

describe('Audits', () => {
  it('has no audits failing when tags is called', () => {
    return walkTree.then(audits => {
      audits.forEach(audit => {
        assert.doesNotThrow(_ => audit.tags);
      });
    });
  });

  it('has no audits failing when name is called', () => {
    return walkTree.then(audits => {
      audits.forEach(audit => {
        assert.doesNotThrow(_ => audit.name);
      });
    });
  });

  it('has no audits failing when description is called', () => {
    return walkTree.then(audits => {
      audits.forEach(audit => {
        assert.doesNotThrow(_ => audit.description);
      });
    });
  });
});
