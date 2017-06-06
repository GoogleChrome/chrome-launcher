/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assetSaver = require('../../lib/asset-saver');
const Metrics = require('../../lib/traces/pwmetrics-events');
const assert = require('assert');
const fs = require('fs');

const screenshotFilmstrip = require('../fixtures/traces/screenshots.json');
const traceEvents = require('../fixtures/traces/progressive-app.json');
const dbwTrace = require('../fixtures/traces/dbw_tester.json');
const dbwResults = require('../fixtures/dbw_tester-perf-results.json');
const Audit = require('../../audits/audit.js');

/* eslint-env mocha */
describe('asset-saver helper', () => {
  it('generates HTML', () => {
    const artifacts = {
      devtoolsLogs: {},
      traces: {
        [Audit.DEFAULT_PASS]: {
          traceEvents: []
        }
      },
      requestScreenshots: () => Promise.resolve([]),
    };
    return assetSaver.prepareAssets(artifacts).then(assets => {
      assert.ok(/<!doctype/gim.test(assets[0].screenshotsHTML));
    });
  });

  describe('saves files', function() {
    const artifacts = {
      devtoolsLogs: {
        [Audit.DEFAULT_PASS]: [{message: 'first'}, {message: 'second'}]
      },
      traces: {
        [Audit.DEFAULT_PASS]: {
          traceEvents
        }
      },
      requestScreenshots: () => Promise.resolve(screenshotFilmstrip)
    };

    assetSaver.saveAssets(artifacts, dbwResults.audits, process.cwd() + '/the_file');

    it('trace file saved to disk with data', () => {
      const traceFilename = 'the_file-0.trace.json';
      const traceFileContents = fs.readFileSync(traceFilename, 'utf8');
      assert.ok(traceFileContents.length > 3000000);
      fs.unlinkSync(traceFilename);
    });

    it('devtools log file saved to disk with data', () => {
      const filename = 'the_file-0.devtoolslog.json';
      const fileContents = fs.readFileSync(filename, 'utf8');
      assert.ok(fileContents.includes('"message": "first"'));
      fs.unlinkSync(filename);
    });

    it('screenshots html file saved to disk with data', () => {
      const ssHTMLFilename = 'the_file-0.screenshots.html';
      const ssFileContents = fs.readFileSync(ssHTMLFilename, 'utf8');
      assert.ok(/<!doctype/gim.test(ssFileContents));
      const expectedScreenshotContent = '{"timestamp":674089419.919';
      assert.ok(ssFileContents.includes(expectedScreenshotContent), 'unexpected screenshot html');
      fs.unlinkSync(ssHTMLFilename);
    });

    it('screenshots json file saved to disk with data', () => {
      const ssJSONFilename = 'the_file-0.screenshots.json';
      const ssContents = JSON.parse(fs.readFileSync(ssJSONFilename, 'utf8'));
      assert.equal(ssContents[0].timestamp, 674089419.919, 'unexpected screenshot json');
      fs.unlinkSync(ssJSONFilename);
    });
  });

  describe('prepareAssets', () => {
    it('adds fake events to trace', () => {
      const countEvents = trace => trace.traceEvents.length;
      const mockArtifacts = {
        devtoolsLogs: {},
        traces: {
          defaultPass: dbwTrace
        },
        requestScreenshots: () => Promise.resolve([]),
      };
      const beforeCount = countEvents(dbwTrace);
      return assetSaver.prepareAssets(mockArtifacts, dbwResults.audits).then(preparedAssets => {
        const afterCount = countEvents(preparedAssets[0].traceData);
        const metricsSansNavStart = Metrics.metricsDefinitions.length - 1;
        assert.equal(afterCount, beforeCount + (2 * metricsSansNavStart), 'unexpected event count');
      });
    });
  });
});
