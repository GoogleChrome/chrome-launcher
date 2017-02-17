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

const Aggregate = require('../../aggregator/aggregate');
const assert = require('assert');

/* eslint-env mocha */

describe('Aggregate', () => {
  it('filters empty results', () => {
    const a = [];
    const b = {
      c: 1, f: 2, a: 3
    };

    const c = Aggregate._filterResultsByAuditNames(a, b);
    return assert.equal(c.length, 0);
  });

  it('filters results against an empty set', () => {
    const a = [{name: 'a'}, {name: 'b'}, {name: 'c'}];
    const b = {};

    const c = Aggregate._filterResultsByAuditNames(a, b);
    return assert.equal(c.length, 0);
  });

  it('filters results against an expected set', () => {
    const a = [{name: 'a'}, {name: 'b'}, {name: 'c'}];
    const b = {
      c: 1, f: 2, a: 3
    };

    const c = Aggregate._filterResultsByAuditNames(a, b);
    assert.equal(c[0], a[0]);
    return assert.equal(c[1], a[2]);
  });

  it('returns a weight for an empty set', () => {
    const a = {};

    const weight = Aggregate._getTotalWeight(a);
    return assert.equal(weight, 0);
  });

  it('generates the correct total weight', () => {
    const a = {
      x: {
        weight: 1
      },
      y: {
        weight: 2
      },
      z: {
        weight: 3
      }
    };

    const weight = Aggregate._getTotalWeight(a);
    return assert.equal(weight, 6);
  });

  it('remaps results to an object', () => {
    const a = [{
      name: 'test',
      rawValue: 1
    }, {
      name: 'test-2',
      rawValue: 2
    }, {
      name: 'test-3',
      rawValue: 3
    }];

    const remapped = Aggregate._remapResultsByName(a);
    return assert.deepEqual(remapped, {
      'test': {
        name: 'test',
        rawValue: 1
      },
      'test-2': {
        name: 'test-2',
        rawValue: 2
      },
      'test-3': {
        name: 'test-3',
        rawValue: 3
      }
    });
  });

  it('throws if key already exists during remapping', () => {
    const a = [{
      name: 'test',
      rawValue: 1
    }, {
      name: 'test',
      rawValue: 2
    }];

    return assert.throws(_ => Aggregate._remapResultsByName(a),
      'Cannot remap: test already exists');
  });

  it('throws for undefined inputs', () => {
    return assert.throws(_ => Aggregate._convertToWeight(), 0);
  });

  it('throws for undefined results', () => {
    const expected = {
      expectedValue: true,
      weight: 10
    };
    return assert.throws(_ => Aggregate._convertToWeight(undefined, expected));
  });

  it('returns a weight of zero for undefined expectations', () => {
    const result = {
      rawValue: true,
      score: true,
      displayValue: ''
    };
    return assert.throws(_ => Aggregate._convertToWeight(result, undefined));
  });

  it('returns the correct weight for a boolean result', () => {
    const expected = {
      expectedValue: true,
      weight: 10
    };

    const result = {
      rawValue: true,
      score: true,
      displayValue: ''
    };

    return assert.equal(Aggregate._convertToWeight(result, expected), 10);
  });

  it('returns the correct weight for a numeric result', () => {
    const expected = {
      expectedValue: 100,
      weight: 10
    };

    const result = {
      rawValue: 50,
      score: 50,
      displayValue: '50'
    };

    return assert.equal(Aggregate._convertToWeight(result, expected), 5);
  });

  it('throws if weight is missing from the expected', () => {
    const expected = {
      expectedValue: 100
    };

    const result = {
      rawValue: 50,
      score: 50,
      displayValue: '50'
    };

    return assert.throws(_ => Aggregate._convertToWeight(result, expected), 0);
  });

  it('returns a weight of zero for other inputs', () => {
    const expected = {
      expectedValue: [],
      weight: 10
    };

    const result = {
      rawValue: [],
      score: [],
      displayValue: ''
    };

    return assert.equal(Aggregate._convertToWeight(result, expected), 0);
  });

  it('throws if types do not match', () => {
    const expected = {
      expectedValue: true,
      weight: 10
    };

    const result = {
      rawValue: 20,
      score: 20,
      displayValue: '20'
    };

    return assert.throws(_ => Aggregate._convertToWeight(result, expected));
  });

  it('returns 0 if audit result was an error', () => {
    const expected = {
      expectedValue: true,
      weight: 1
    };

    const result = {
      rawValue: null,
      error: true,
    };

    assert.strictEqual(Aggregate._convertToWeight(result, expected), 0);
  });

  it('scores a set correctly (contributesToScore: true)', () => {
    const items = [{
      audits: {
        'test': {
          expectedValue: true,
          weight: 1
        },
        'alternate-test': {
          expectedValue: 100,
          weight: 3
        }
      }
    }];

    const results = [{
      name: 'test',
      rawValue: false,
      score: false,
      displayValue: ''
    }, {
      name: 'alternate-test',
      rawValue: 50,
      score: 50,
      displayValue: '50'
    }];

    return assert.deepEqual(Aggregate.compare(results, items)[0], {
      overall: 0.375,
      name: undefined,
      description: undefined,
      subItems: [
        'test',
        'alternate-test'
      ]
    });
  });

  it('scores a set correctly (contributesToScore: false)', () => {
    const items = [{
      audits: {
        'test': {
          expectedValue: true,
          weight: 1
        },
        'alternate-test': {
          expectedValue: 100,
          weight: 3
        }
      }
    }];

    const results = [{
      name: 'test',
      rawValue: false,
      score: false,
      displayValue: ''
    }, {
      name: 'alternate-test',
      rawValue: 50,
      score: 50,
      displayValue: '50'
    }];
    return assert.deepEqual(Aggregate.compare(results, items)[0], {
      overall: 0.375,
      name: undefined,
      description: undefined,
      subItems: [
        'test',
        'alternate-test'
      ]
    });
  });

  it('throws when given a result containing no score property', () => {
    const items = [{
      audits: {
        test: {
          expectedValue: true,
          weight: 1
        }
      }
    }];

    const results = [{
      name: 'test',
      value: 'should be rawValue',
      displayValue: ''
    }];

    return assert.throws(_ => Aggregate.compare(results, items));
  });

  it('throws when given an audit containing no expectedValue property', () => {
    const items = [{
      audits: {
        test: {
          weight: 1
        }
      }
    }];

    const results = [{
      name: 'test',
      score: false,
      displayValue: ''
    }];

    return assert.throws(_ => Aggregate.compare(results, items));
  });

  it('throws when attempting to aggregate an audit name not in audit results', () => {
    const items = [{
      audits: {
        'my-audit-test-name': {
          expectedValue: true,
          weight: 1
        }
      }
    }];

    const results = [{
      name: 'alternate-test',
      rawValue: 50,
      score: 50,
      displayValue: '50',
      contributesToScore: true
    }];

    assert.throws(_ => Aggregate.compare(results, items)[0],
      /my-audit-test-name/);
  });

  it('filters out non-aggregated audit results correctly', () => {
    const items = [{
      audits: {
        test: {
          expectedValue: true,
          weight: 1
        }
      }
    }];

    const results = [{
      name: 'test',
      rawValue: true,
      score: true,
      displayValue: 'true',
      contributesToScore: true
    }, {
      name: 'alternate-test',
      rawValue: 50,
      score: 50,
      displayValue: '50',
      contributesToScore: true
    }];

    const aggregation = Aggregate.compare(results, items)[0];
    assert.deepEqual(aggregation, {
      overall: 1,
      name: undefined,
      description: undefined,
      subItems: [
        'test'
      ]
    });
  });

  it('outputs a score', () => {
    const items = [{
      audits: {
        test: {
          expectedValue: true,
          weight: 1
        }
      }
    }];

    const results = [{
      name: 'test',
      rawValue: true,
      score: true,
      displayValue: ''
    }];
    return assert.equal(Aggregate.compare(results, items)[0].overall, 1);
  });

  it('if audit result is an error it does not contribute to score', () => {
    const items = [{
      audits: {
        'test': {
          expectedValue: true,
          weight: 1
        },
        'alternate-test': {
          expectedValue: 100,
          weight: 1
        }
      }
    }];

    const errorResult = new Error('error message');
    errorResult.name = 'alternate-test';
    const results = [{
      name: 'test',
      rawValue: true,
      score: true,
      displayValue: ''
    }, {
      name: 'alternate-test',
      rawValue: null,
      error: true
    }];

    const aggregate = Aggregate.compare(results, items)[0];
    assert.strictEqual(aggregate.overall, 0.5);
  });

  it('outputs subitems', () => {
    const items = [{
      audits: {
        test: {
          expectedValue: true,
          weight: 1
        }
      }
    }];

    const results = [{
      name: 'test',
      rawValue: true,
      score: true,
      displayValue: ''
    }];

    return assert.ok(Array.isArray(Aggregate.compare(results, items)[0].subItems));
  });

  it('aggregates', () => {
    // Make a fake aggregation and test it.
    const aggregation = {
      name: 'name',
      description: 'description',
      scored: true,
      categorizable: true,
      items: [{
        audits: {
          test: {
            expectedValue: true,
            weight: 1
          }
        }
      }]
    };

    const results = [{
      name: 'test',
      rawValue: true,
      score: true,
      displayValue: ''
    }];

    const output = Aggregate.aggregate(aggregation, results);
    assert.equal(output.name, aggregation.name);
    assert.equal(output.shortName, aggregation.shortName);
    assert.equal(output.description, aggregation.description);
    assert.equal(output.score[0].overall, 1);
    return assert.equal(output.score[0].subItems.length, 1);
  });

  it('counts a total', () => {
    const scores = [
      {overall: 1},
      {overall: 0.5}
    ];
    assert.equal(Aggregate.getTotal(scores), 0.75);
  });
});
