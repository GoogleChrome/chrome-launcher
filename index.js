/**
 * Copyright 2015 Google Inc. All rights reserved.
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

let TestLoader = require('./helpers/test-loader');
let DOMParser = require('./helpers/dom-parser');
let https = require('https');

class TestRunner {

  static get () {
    return new Promise((resolve, reject) => {
      TestLoader.getTests('tests').then(tests => {
        resolve(new TestRunner(tests));
      });
    });
  }

  constructor (tests) {
    this.tests = tests;
  }

  test (url) {

    let testNames = Object.keys(this.tests);
    let testResponses = [];

    testNames.forEach(testName => {

      let testInfo = this.tests[testName];
      let test = require(testInfo.main);

      testResponses.push(
        this.buildInputsForURL(url, testInfo.inputs)
            .then(inputs => test.run(inputs))
      );

    });

    return Promise.all(testResponses);
  }

  buildInputsForURL (url, inputs) {

    let outputs = [];
    let output;

    inputs.forEach(input => {

      input = input.toLowerCase();

      switch (input) {

      case 'html':
        output = new Promise((resolve, reject) => {
          https.get(url, (res) => {
            let body = '';
            res.on('data', data => body += data);
            res.on('end', () => resolve(body));
          });
        });
        break;

      case 'dom':
        output = new Promise((resolve, reject) => {
          https.get(url, (res) => {
            let body = '';
            res.on('data', data => body += data);
            res.on('end', () => resolve(DOMParser.parse(body)));
          });
        });
        break;

      default:
        console.warn('Unknown input type: ' + input);
        break;
      }

      outputs.push(output);
    });

    return Promise.all(outputs);
  }

}

TestRunner.get()
    .then(testRunner => testRunner.test('https://aerotwist.com/'))
    .then(results => {
      console.log(results);
    }, err => {
      console.error(err);
    });

