/**
 * Copyright 2017 Google Inc. All rights reserved.
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

const UnusedCSSAudit = require('../../audits/unused-css-rules.js');
const assert = require('assert');

/* eslint-env mocha */

describe('Best Practices: unused css rules audit', () => {
  describe('#mapSheetToResult', () => {
    let baseSheet;

    function map(overrides) {
      return UnusedCSSAudit.mapSheetToResult(Object.assign(baseSheet, overrides));
    }

    function generate(content, length) {
      const arr = [];
      for (let i = 0; i < length; i++) {
        arr.push(content);
      }
      return arr.join('');
    }

    beforeEach(() => {
      baseSheet = {
        header: {sourceURL: ''},
        content: '',
        used: [],
        unused: [],
      };
    });

    it('correctly computes percentUsed', () => {
      assert.ok(/0%/.test(map({used: [], unused: []}).label));
      assert.ok(/0%/.test(map({used: [], unused: [1, 2]}).label));
      assert.ok(/50%/.test(map({used: [1, 2], unused: [1, 2]}).label));
      assert.ok(/100%/.test(map({used: [1, 2], unused: []}).label));
    });

    it('correctly computes url', () => {
      assert.equal(map({header: {sourceURL: ''}}).url, 'inline');
      assert.equal(map({header: {sourceURL: 'foobar'}}).url, 'foobar');
    });

    it('correctly computes short content preview', () => {
      const shortContent = `
        html, body {
          background: green;
        }
      `.trim();

      assert.equal(map({content: shortContent}).code, shortContent);
    });

    it('correctly computes long content preview', () => {
      const longContent = `
        body {
          color: white;
        }

        html {
          content: '${generate('random', 50)}';
        }
      `.trim();

      assert.equal(map({content: longContent}).code, `
        body {
          color: white;
        } ...
      `.trim());
    });

    it('correctly computes long rule content preview', () => {
      const longContent = `
        body {
          color: white;
          font-size: 20px;
          content: '${generate('random', 50)}';
        }
      `.trim();

      assert.equal(map({content: longContent}).code, `
        body {
          color: white;
          font-size: 20px; ... } ...
      `.trim());
    });

    it('correctly computes long comment content preview', () => {
      const longContent = `
      /**
       * @license ${generate('a', 100)}
       */
      `.trim();

      assert.ok(/aaa\.\.\.$/.test(map({content: longContent}).code));
    });
  });

  describe('#audit', () => {
    it('fails when gatherers failed', () => {
      const result = UnusedCSSAudit.audit({
        CSSUsage: {rawValue: -1, debugString: 'It errored'},
        Styles: []
      });

      assert.equal(result.debugString, 'It errored');
      assert.equal(result.rawValue, -1);
    });

    it('passes when rules are used', () => {
      const result = UnusedCSSAudit.audit({
        CSSUsage: [
          {styleSheetId: 'a', used: true},
          {styleSheetId: 'a', used: true},
          {styleSheetId: 'b', used: true},
        ],
        Styles: [
          {
            header: {styleSheetId: 'a', sourceURL: 'a.css'},
            content: '.my.selector {color: #ccc;}\n a {color: #fff}'
          },
          {
            header: {styleSheetId: 'b', sourceURL: 'b.css'},
            content: '.my.favorite.selector { rule: content; }'
          }
        ]
      });

      assert.ok(!result.displayValue);
      assert.equal(result.rawValue, true);
      assert.equal(result.extendedInfo.value.length, 2);
    });

    it('fails when rules are unused', () => {
      const result = UnusedCSSAudit.audit({
        CSSUsage: [
          {styleSheetId: 'a', used: true},
          {styleSheetId: 'a', used: false},
          {styleSheetId: 'a', used: false},
          {styleSheetId: 'b', used: true},
          {styleSheetId: 'b', used: false},
          {styleSheetId: 'c', used: false},
        ],
        Styles: [
          {
            header: {styleSheetId: 'a', sourceURL: 'a.css'},
            content: '.my.selector {color: #ccc;}\n a {color: #fff}'
          },
          {
            header: {styleSheetId: 'b', sourceURL: 'b.css'},
            content: '.my.favorite.selector { rule: content; }'
          },
          {
            header: {styleSheetId: 'c', sourceURL: ''},
            content: '.my.other.selector { rule: content; }'
          }
        ]
      });

      assert.ok(result.displayValue);
      assert.equal(result.rawValue, false);
      assert.equal(result.extendedInfo.value.length, 3);
    });
  });
});
