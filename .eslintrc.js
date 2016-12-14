module.exports = {
  // start with google standard style
  //     https://github.com/google/eslint-config-google/blob/master/index.js
  "extends": "google",
  "env": {
    "node": true
  },
  "rules": {
    // 2 == error, 1 == warning, 0 == off
    "max-len": [2, 100, {
      "ignoreComments": true,
      "ignoreUrls": true,
      "tabWidth": 2
    }],
    "no-implicit-coercion": [2, {
      "boolean": false,
      "number": true,
      "string": true
    }],
    "no-unused-expressions": [2, {
      "allowShortCircuit": true,
      "allowTernary": false
    }],
    "no-unused-vars": [2, {
      "vars": "all",
      "args": "after-used",
      "argsIgnorePattern": "(^reject$|^_$)",
      "varsIgnorePattern": "(^_$)"
    }],
    "quotes": [2, "single"],
    "strict": [2, "global"],
    "prefer-const": 2,

    // Disabled rules
    "require-jsdoc": 0,
    "valid-jsdoc": 0,
    "comma-dangle": 0,
    "arrow-parens": 0,
    // Compat: support for rest params is behind a flag for node v5.x
    "prefer-rest-params": 0,
  },
  "parserOptions": {
    "ecmaVersion": 6,
    "ecmaFeatures": {
      "globalReturn": true,
      "jsx": false,
      "experimentalObjectRestSpread": false
    },
    "sourceType": "script"
  }
}
