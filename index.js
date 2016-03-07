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
let RemoteFileLoader = require('./helpers/remote-file-loader');
let https = require('https');
let ChromeDriver = require('./helpers/browser/driver');

let processor = require('./lib/processor');


class TestRunner {

  static get () {
    return new Promise((resolve, reject) => {
      TestLoader.getTests('tests').then(tests => {
        resolve(new TestRunner(tests));
      });
    });
  }

  constructor (tests) {
    this.tests_ = tests;
    this.driver_ = null;
    this.loader_ = new RemoteFileLoader();
  }

  test (url) {

    let testNames = Object.keys(this.tests_);
    let testResponses = [];

    testNames.forEach(testName => {

      let testInfo = this.tests_[testName];
      let test = require(testInfo.main);

      testResponses.push(
        this.buildInputsForTest(url, testInfo.inputs)
            .then(inputs => test.run(inputs))
            .then(result => {
              return {testName, result};
            })
      );

    });

    return Promise.all(testResponses).then(results => {
      if (this.driver_ !== null) {
        if (typeof this.driver_.browser !== 'undefined') {
          this.driver_.browser.quit();
        }
      }
      return results;
    });
  }

  buildInputsForTest (url, inputs) {

    let collatedOutputs = {
      loader: this.loader_
    };
    let outputPromises = [];
    let outputPromise;

    inputs.forEach(input => {

      input = input.toLowerCase();

      switch (input) {

      case 'html':
        outputPromise = new Promise((resolve, reject) => {
          https.get(url, (res) => {
            let body = '';
            res.on('data', data => body += data);
            res.on('end', () => {
              collatedOutputs.html = body;
              resolve();
            });
          });
        });
        break;

      case 'dom':
        outputPromise = new Promise((resolve, reject) => {
            // shut up
            return resolve();
          https.get(url, (res) => {
            let body = '';
            res.on('data', data => body += data);
            res.on('end', () => {
              try {
                collatedOutputs.dom = DOMParser.parse(body);
              } catch (e){
                reject(e);
              }
              resolve();
            });
          });
        });
        break;

      case 'chrome':
        outputPromise = new Promise((resolve, reject) => {

          if (this.driver_ === null) {
            this.driver_ = new ChromeDriver();
          }

          collatedOutputs.driver = this.driver_;
          resolve();
        });
        break;

      case 'url':
        collatedOutputs.url = url;
        outputPromise = Promise.resolve();
        break;

      default:
        console.warn('Unknown input type: ' + input);
        break;
      }

      outputPromises.push(outputPromise);
    });

    return Promise.all(outputPromises).then(() => collatedOutputs);
  }

}

TestRunner.get()
    .then(testRunner => testRunner.test('https://voice-memos.appspot.com/'))
    .then(results => {
      console.log(results);
    }, err => {
      console.error(err);
    });


module.exports = {

  RESPONSE: processor.RESPONSE,
  ANIMATION: processor.ANIMATION,
  LOAD: processor.LOAD,

  analyze: function (traceContents, opts) {
    return processor.analyzeTrace(traceContents, opts);
  }
};