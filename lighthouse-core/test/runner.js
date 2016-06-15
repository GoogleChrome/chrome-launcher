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
const IsOnHTTPS = require('../audits/is-on-https');
const HTTPSGatherer = require('../driver/gatherers/https');
const fakeDriver = require('./driver/fake-driver');
const assert = require('assert');

/* global describe, it*/

describe('Runner', () => {
  it('gets gatherers needed by audits', () => {
    const requiredGatherers = Runner.getGatherersNeededByAudits([IsOnHTTPS]);
    assert.ok(requiredGatherers.has('HTTPS'));
  });

  it('returns an empty set for required gatherers when no audits are specified', () => {
    const requiredGatherers = Runner.getGatherersNeededByAudits();
    assert.equal(requiredGatherers.size, 0);
  });

  it('expands gatherers', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = {
      passes: [{
        gatherers: ['https']
      }],
      audits: [
        'is-on-https'
      ]
    };

    return Runner.run(fakeDriver, {url, config, flags}).then(_ => {
      assert.ok(typeof config.passes[0].gatherers[0] === 'object');
    });
  });

  it('ignores expanded gatherers', () => {
    'use strict';

    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = {
      passes: [{
        gatherers: [new HTTPSGatherer()]
      }],
      audits: [
        'is-on-https'
      ]
    };

    let run;
    assert.doesNotThrow(_ => {
      run = Runner.run(fakeDriver, {url, config, flags});
    });

    return run.then(_ => {
      assert.ok(typeof config.passes[0].gatherers[0] === 'object');
    });
  });

  it('throws for unknown gatherers', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = {
      passes: [{
        gatherers: ['fuzz']
      }],
      audits: [
        'is-on-https'
      ]
    };

    return assert.throws(_ => Runner.run(fakeDriver, {url, config, flags}),
        /Unable to locate/);
  });

  it('throws when given neither passes nor artifacts', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = {
      audits: [
        'is-on-https'
      ]
    };

    return assert.throws(_ => Runner.run(fakeDriver, {url, config, flags}),
        /The config must provide passes/);
  });

  it('accepts existing artifacts', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = {
      audits: [
        'is-on-https'
      ],

      artifacts: {
        HTTPS: true
      }
    };

    return assert.doesNotThrow(_ => Runner.run(fakeDriver, {url, config, flags}));
  });

  it('throws when given neither audits nor auditResults', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = {
      passes: [{
        gatherers: ['https']
      }]
    };

    return assert.throws(_ => Runner.run(fakeDriver, {url, config, flags}),
        /The config must provide passes/);
  });

  it('accepts existing auditResults', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = {
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
    };

    return assert.doesNotThrow(_ => Runner.run(fakeDriver, {url, config, flags}));
  });

  it('returns an aggregation', () => {
    const url = 'https://example.com';
    const flags = {
      auditWhitelist: null
    };
    const config = {
      auditResults: [{
        name: 'is-on-https',
        value: true
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
              value: true,
              weight: 1
            }
          }
        }]
      }]
    };

    return Runner.run(fakeDriver, {url, config, flags}).then(results => {
      assert.equal(results.url, url);
      assert.equal(results.aggregations[0].score[0].overall, 1);
    });
  });
});
