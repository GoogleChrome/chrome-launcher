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
const Runner = require('../runner');
const fakeDriver = require('./gather/fake-driver');
const Config = require('../config');
const Audit = require('../audits/audit');
const assert = require('assert');
const path = require('path');

/* global describe, it*/

describe('Runner', () => {
  it('expands gatherers', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = new Config({
      passes: [{
        gatherers: ['https']
      }],
      audits: [
        'is-on-https'
      ]
    });

    return Runner.run(fakeDriver, {url, config, flags}).then(_ => {
      assert.ok(typeof config.passes[0].gatherers[0] === 'object');
    });
  });

  it('throws when given neither passes nor artifacts', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = new Config({
      audits: [
        'is-on-https'
      ]
    }, flags.auditWhitelist);

    return assert.throws(_ => Runner.run(fakeDriver, {url, config, flags}),
        /The config must provide passes/);
  });

  it('accepts existing artifacts', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = new Config({
      audits: [
        'is-on-https'
      ],

      artifacts: {
        HTTPS: true
      }
    }, flags.auditWhitelist);

    return assert.doesNotThrow(_ => Runner.run({}, {url, config, flags}));
  });

  it('accepts trace artifacts as paths and outputs appropriate data', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };

    const config = new Config({
      audits: [
        'user-timings'
      ],

      artifacts: {
        traces: {
          [Audit.DEFAULT_TRACE]: path.join(__dirname, '/fixtures/traces/trace-user-timings.json')
        }
      }
    }, flags.auditWhitelist);

    return Runner.run({}, {url, config, flags}).then(results => {
      assert.equal(results[0].rawValue, 2);
      assert.equal(results[0].name, 'user-timings');
    });
  });

  it('fails gracefully with empty artifacts object', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };

    const config = new Config({
      audits: [
        'user-timings'
      ],

      artifacts: {
      }
    }, flags.auditWhitelist);

    return Runner.run({}, {url, config, flags}).then(results => {
      assert.equal(results[0].rawValue, -1);
      assert(results[0].debugString);
    });
  });

  it('accepts performance logs as an artifact', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = new Config({
      audits: [
        'critical-request-chains'
      ],

      artifacts: {
        performanceLog: path.join(__dirname, '/fixtures/perflog.json')
      }
    }, flags.auditWhitelist);

    return Runner.run({}, {url, config, flags}).then(results => {
      assert.equal(results[0].rawValue, 9);
      assert.equal(results[0].name, 'critical-request-chains');
    });
  });

  it('throws when given neither audits nor auditResults', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = new Config({
      passes: [{
        gatherers: ['https']
      }]
    }, flags.auditWhitelist);

    return assert.throws(_ => Runner.run(fakeDriver, {url, config, flags}),
        /The config must provide passes/);
  });

  it('accepts existing auditResults', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = new Config({
      auditResults: {
        HTTPS: true
      },

      aggregations: [{
        name: 'Aggregation',
        description: '',
        scored: true,
        categorizable: true,
        items: [{
          name: 'name',
          description: 'description',
          criteria: {
            'is-on-https': {
              value: true,
              weight: 1
            }
          }
        }]
      }]
    }, flags.auditWhitelist);

    return assert.doesNotThrow(_ => Runner.run(fakeDriver, {url, config, flags}));
  });

  it('returns an aggregation', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = new Config({
      auditResults: [{
        name: 'is-on-https',
        rawValue: true,
        score: true,
        displayValue: ''
      }],

      aggregations: [{
        name: 'Aggregation',
        description: '',
        scored: true,
        categorizable: true,
        items: [{
          name: 'name',
          description: 'description',
          criteria: {
            'is-on-https': {
              rawValue: true,
              weight: 1
            }
          }
        }]
      }]
    }, flags.auditWhitelist);

    return Runner.run(fakeDriver, {url, config, flags}).then(results => {
      assert.equal(results.url, url);
      assert.equal(results.audits['is-on-https'].name, 'is-on-https');
      assert.equal(results.aggregations[0].score[0].overall, 1);
      assert.equal(results.aggregations[0].score[0].subItems[0], 'is-on-https');
    });
  });

  it('rejects when not given a URL', () => {
    return Runner.run({}, {}).then(_ => assert.ok(false), _ => assert.ok(true));
  });

  it('rejects when given a URL of zero length', () => {
    return Runner.run({}, {url: ''}).then(_ => assert.ok(false), _ => assert.ok(true));
  });
});
