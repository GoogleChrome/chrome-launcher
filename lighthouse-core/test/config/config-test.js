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
const Gatherer = require('../../gather/gatherers/gatherer');
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

  it('doesn\'t change directly injected plugins', () => {
    class MyGatherer extends Gatherer {}
    class MyAudit extends Audit {
      static get meta() {
        return {
          name: 'MyAudit',
          category: 'mine',
          description: 'My audit',
          requiredArtifacts: []
        };
      }
      static audit() {}
    }
    const config = {
      passes: [{
        gatherers: [MyGatherer]
      }],
      audits: [MyAudit]
    };
    const newConfig = new Config(config);
    assert.equal(MyGatherer, newConfig.passes[0].gatherers[0]);
    assert.equal(MyAudit, newConfig.audits[0]);
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
        recordNetwork: true,
        passName: unlikelyPassName,
        gatherers: []
      }, {
        recordNetwork: true,
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
        recordNetwork: true,
        gatherers: []
      }, {
        recordNetwork: true,
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

  it('throws when an audit is not found', () => {
    return assert.throws(_ => new Config({
      audits: ['/fake-path/non-existent-audit']
    }), /locate audit/);
  });

  it('throws on a non-absolute config path', () => {
    const configPath = '../../config/default.json';

    return assert.throws(_ => new Config({
      audits: []
    }, configPath), /absolute path/);
  });

  it('loads an audit relative to a config path', () => {
    const configPath = __filename;

    return assert.doesNotThrow(_ => new Config({
      audits: ['../fixtures/valid-custom-audit']
    }, configPath));
  });

  it('loads an audit from node_modules/', () => {
    return assert.throws(_ => new Config({
      // Use a lighthouse dep as a stand in for a module.
      audits: ['mocha']
    }), function(err) {
      // Should throw an audit validation error, but *not* an audit not found error.
      return !/locate audit/.test(err) && /audit\(\) method/.test(err);
    });
  });

  it('loads an audit relative to the working directory', () => {
    // Construct an audit URL relative to current working directory, regardless
    // of where test was started from.
    const absoluteAuditPath = path.resolve(__dirname, '../fixtures/valid-custom-audit');
    assert.doesNotThrow(_ => require.resolve(absoluteAuditPath));
    const relativePath = path.relative(process.cwd(), absoluteAuditPath);

    return assert.doesNotThrow(_ => new Config({
      audits: [relativePath]
    }));
  });

  it('throws but not for missing audit when audit has a dependency error', () => {
    return assert.throws(_ => new Config({
      audits: [path.resolve(__dirname, '../fixtures/invalid-audits/require-error.js')]
    }), function(err) {
      // We're expecting not to find parent class Audit, so only reject on our
      // own custom locate audit error, not the usual MODULE_NOT_FOUND.
      return !/locate audit/.test(err) && err.code === 'MODULE_NOT_FOUND';
    });
  });

  it('throws when it finds invalid audits', () => {
    const basePath = path.resolve(__dirname, '../fixtures/invalid-audits');
    assert.throws(_ => new Config({
      audits: [basePath + '/missing-audit']
    }), /audit\(\) method/);

    assert.throws(_ => new Config({
      audits: [basePath + '/missing-category']
    }), /meta.category property/);

    assert.throws(_ => new Config({
      audits: [basePath + '/missing-name']
    }), /meta.name property/);

    assert.throws(_ => new Config({
      audits: [basePath + '/missing-description']
    }), /meta.description property/);

    assert.throws(_ => new Config({
      audits: [basePath + '/missing-required-artifacts']
    }), /meta.requiredArtifacts property/);

    return assert.throws(_ => new Config({
      audits: [basePath + '/missing-generate-audit-result']
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
