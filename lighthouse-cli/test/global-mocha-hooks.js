'use strict';

const assert = require('assert');

/**
 * THIS FILE IS A DUPLICATE OF lighthouse-core/test/global-mocha-hooks.js
 * Please keep them in sync.
 */

/* eslint-env mocha */
let currTest;

// monkey-patch all assert.* methods
Object.keys(assert)
  .filter(key => typeof assert[key] === 'function')
  .forEach(key => {
    const _origFn = assert[key];
    assert[key] = function(...args) {
      if (currTest) {
        currTest._assertions++;
      }
      return _origFn.apply(this, args);
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

