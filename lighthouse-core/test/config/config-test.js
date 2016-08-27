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

const Config = require('../../config/config');
const assert = require('assert');
const path = require('path');
const defaultConfig = require('../../config/default.json');
const log = require('../../lib/log');
const Audit = require('../../audits/audit');

/* eslint-env mocha */

describe('Config', () => {
  it('returns new object', () => {
    const config = {
      audits: ['is-on-https']
    };
    const newConfig = new Config(config);
    assert.notEqual(config, newConfig);
  });

  it('uses the default config when no config is provided', () => {
    const config = new Config();
    assert.deepStrictEqual(defaultConfig.aggregations, config.aggregations);
    assert.equal(defaultConfig.audits.length, config.audits.length);
  });

  it('warns when a passName is used twice', () => {
    const unlikelyPassName = 'unlikelyPassName';
    const configJson = {
      passes: [{
        network: true,
        passName: unlikelyPassName,
        gatherers: []
      }, {
        network: true,
        passName: unlikelyPassName,
        gatherers: []
      }],
      audits: []
    };

    return new Promise((resolve, reject) => {
      const warningListener = function(args) {
        const warningMsg = args[1];
        if (new RegExp(`overwrite.+${unlikelyPassName}`).test(warningMsg)) {
          log.events.removeListener('warning', warningListener);
          resolve();
        }
      };
      log.events.addListener('warning', warningListener);

      const _ = new Config(configJson);
    });
  });

  it('warns when traced twice with no passNames specified', () => {
    const configJson = {
      passes: [{
        network: true,
        gatherers: []
      }, {
        network: true,
        gatherers: []
      }],
      audits: []
    };

    return new Promise((resolve, reject) => {
      const warningListener = function(args) {
        const warningMsg = args[1];
        if (new RegExp(`overwrite.+${Audit.DEFAULT_PASS}`).test(warningMsg)) {
          log.events.removeListener('warning', warningListener);
          resolve();
        }
      };
      log.events.addListener('warning', warningListener);

      const _ = new Config(configJson);
    });
  });

  it('throws for unknown gatherers', () => {
    const config = {
      passes: [{
        gatherers: ['fuzz']
      }],
      audits: [
        'is-on-https'
      ]
    };

    return assert.throws(_ => new Config(config),
        /Unable to locate/);
  });

  it('doesn\'t mutate old gatherers when filtering passes', () => {
    const configJSON = {
      passes: [{
        gatherers: [
          'url',
          'https',
          'viewport'
        ]
      }],
      audits: ['is-on-https']
    };

    const _ = new Config(configJSON);
    assert.equal(configJSON.passes[0].gatherers.length, 3);
  });

  it('contains new copies of auditResults and aggregations', () => {
    const configJSON = defaultConfig;
    configJSON.auditResults = [{
      value: 1,
      rawValue: 1.0,
      optimalValue: 1.0,
      name: 'Test Audit',
      extendedInfo: {
        formatter: 'Supported formatter',
        value: {
          a: 1
        }
      }
    }];

    const config = new Config(configJSON);
    assert.notEqual(config, configJSON, 'Objects are strictly different');
    assert.ok(config.aggregations, 'Aggregations array exists');
    assert.ok(config.auditResults, 'Audits array exists');
    assert.deepStrictEqual(config.aggregations, configJSON.aggregations, 'Aggregations match');
    assert.notEqual(config.aggregations, configJSON.aggregations, 'Aggregations not same object');
    assert.notEqual(config.auditResults, configJSON.auditResults, 'Audits not same object');
    assert.deepStrictEqual(config.auditResults, configJSON.auditResults, 'Audits match');
  });

  it('expands audits', () => {
    const config = new Config({
      audits: ['user-timings']
    });

    assert.ok(Array.isArray(config.audits));
    assert.equal(config.audits.length, 1);
    return assert.equal(typeof config.audits[0], 'function');
  });

  it('throws when it audit is not found', () => {
    return assert.throws(_ => new Config({
      audits: ['/fake-path/non-existent-audit']
    }));
  });

  it('loads an audit relative to a config', () => {
    return assert.doesNotThrow(_ => new Config({
      audits: ['../fixtures/valid-custom-audit']
    }, __filename));
  });

  it('throws when it finds invalid audits', () => {
    assert.throws(_ => new Config({
      audits: ['../test/fixtures/invalid-audits/missing-audit']
    }), /audit\(\) method/);

    assert.throws(_ => new Config({
      audits: ['../test/fixtures/invalid-audits/missing-category']
    }), /meta.category property/);

    assert.throws(_ => new Config({
      audits: ['../test/fixtures/invalid-audits/missing-name']
    }), /meta.name property/);

    assert.throws(_ => new Config({
      audits: ['../test/fixtures/invalid-audits/missing-description']
    }), /meta.description property/);

    assert.throws(_ => new Config({
      audits: ['../test/fixtures/invalid-audits/missing-required-artifacts']
    }), /meta.requiredArtifacts property/);

    return assert.throws(_ => new Config({
      audits: ['../test/fixtures/invalid-audits/missing-generate-audit-result']
    }), /generateAuditResult\(\) method/);
  });

  it('expands artifacts', () => {
    const config = new Config({
      artifacts: {
        traces: {
          defaultPass: path.resolve(__dirname, '../fixtures/traces/trace-user-timings.json')
        },
        performanceLog: path.resolve(__dirname, '../fixtures/perflog.json')
      }
    });
    const traceUserTimings = require('../fixtures/traces/trace-user-timings.json');
    assert.deepStrictEqual(config.artifacts.traces.defaultPass.traceEvents, traceUserTimings);
    assert.equal(config.artifacts.networkRecords.defaultPass.length, 76);
  });

  it('expands artifacts with multiple named passes', () => {
    const config = new Config({
      artifacts: {
        traces: {
          defaultPass: path.resolve(__dirname, '../fixtures/traces/trace-user-timings.json'),
          otherPass: path.resolve(__dirname, '../fixtures/traces/trace-user-timings.json')
        },
        performanceLog: {
          defaultPass: path.resolve(__dirname, '../fixtures/perflog.json'),
          otherPass: path.resolve(__dirname, '../fixtures/perflog.json')
        }
      }
    });
    const traceUserTimings = require('../fixtures/traces/trace-user-timings.json');
    assert.deepStrictEqual(config.artifacts.traces.defaultPass.traceEvents, traceUserTimings);
    assert.deepStrictEqual(config.artifacts.traces.otherPass.traceEvents, traceUserTimings);
    assert.equal(config.artifacts.networkRecords.defaultPass.length, 76);
    assert.equal(config.artifacts.networkRecords.otherPass.length, 76);
  });

  it('handles traces with no TracingStartedInPage events', () => {
    const config = new Config({
      artifacts: {
        traces: {
          defaultPass: path.resolve(__dirname,
                           '../fixtures/traces/trace-user-timings-no-tracingstartedinpage.json')
        },
        performanceLog: path.resolve(__dirname, '../fixtures/perflog.json')
      }
    });

    assert.ok(config.artifacts.traces.defaultPass.traceEvents.find(
          e => e.name === 'TracingStartedInPage' && e.args.data.page === '0xhad00p'));
  });
});
