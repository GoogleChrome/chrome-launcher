'use strict';

const assert = global.assert = require('assert');

/**
 * We don't want any mocha tests to run without evaluating any assertions
 * These hooks will throw if an it() test completes without any assert.foo()
 * having run.
 */

/* eslint-env mocha */
let currTest;

// monkey-patch all assert.* methods
Object.keys(assert)
  .filter(key => typeof assert[key] === 'function')
  .forEach(key => {
    const _origFn = assert[key];
    assert[key] = function() {
      if (currTest) {
        currTest._assertions++;
      }
      return _origFn.apply(this, arguments);
    };
  }
);

// store the count of assertions on each test's state object
beforeEach(function() {
  // eslint-disable-next-line no-invalid-this
  currTest = this.currentTest;
  currTest._assertions = currTest._assertions || 0;
});

afterEach(function() {
  if (currTest._assertions === 0) {
    throw new Error(`ZERO assertions in test: "${currTest.title}"\n${currTest.file}`);
  }
  currTest = null;
});

