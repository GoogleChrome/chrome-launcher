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
'use strict';

/* eslint max-nested-callbacks: ["error", 5] */
/* eslint-env mocha */

const assert = require('assert');
const walk = require('walk');
const path = require('path');
const Handlebars = require('handlebars');
const handlebarHelpers = require('../../report/handlebar-helpers');

const walkTree = new Promise((resolve, reject) => {
  const fullFilePath = path.join(__dirname, '../../formatters/');
  const walker = walk.walk(fullFilePath, {
    filters: ['partials']
  });
  const formatters = [];

  walker.on('file', (root, fileStats, next) => {
    if (fileStats.name === 'formatter.js' || !fileStats.name.endsWith('.js')) {
      return next();
    }

    formatters.push(require(root + '/' + fileStats.name));
    next();
  });

  walker.on('end', () => {
    resolve(formatters);
  });
});

describe('Formatters', () => {
  after(() => {
    Object.keys(handlebarHelpers).forEach(Handlebars.unregisterHelper, Handlebars);
  });

  it('has no formatters failing when getFormatter("html") is called', () => {
    return walkTree.then(formatters => {
      formatters.forEach(formatter => {
        assert.doesNotThrow(_ => formatter.getFormatter('html'), 'bad: ' + formatter.name);
      });
    });
  });

  it('has no formatters succeeding when getFormatter("invalid-formatter") is called', () => {
    return walkTree.then(formatters => {
      formatters.forEach(formatter => {
        assert.throws(_ => formatter.getFormatter('invalid-formatter'));
      });
    });
  });
});
