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

const UnusedCSSAudit = require('../../../audits/byte-efficiency/unused-css-rules.js');
const assert = require('assert');

/* eslint-env mocha */

describe('Best Practices: unused css rules audit', () => {
  function generate(content, length) {
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(content);
    }
    return arr.join('');
  }

  describe('#determineContentPreview', () => {
    function assertLinesContained(actual, expected) {
      expected.split('\n').forEach(line => {
        assert.ok(actual.includes(line.trim()), `${line} is found in preview`);
      });
    }

    const preview = UnusedCSSAudit.determineContentPreview;

    it('correctly computes short content preview', () => {
      const shortContent = `
        html, body {
          background: green;
        }
      `.trim();

      assertLinesContained(preview(shortContent), shortContent);
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

      assertLinesContained(preview(longContent), `
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

      assertLinesContained(preview(longContent), `
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

      assert.ok(/aaa\.\.\./.test(preview(longContent)));
    });
  });

  describe('#mapSheetToResult', () => {
    let baseSheet;
    const baseUrl = 'http://g.co/';

    function map(overrides, url = baseUrl) {
      if (overrides.header && overrides.header.sourceURL) {
        overrides.header.sourceURL = baseUrl + overrides.header.sourceURL;
      }
      return UnusedCSSAudit.mapSheetToResult(Object.assign(baseSheet, overrides), url);
    }

    beforeEach(() => {
      baseSheet = {
        header: {sourceURL: baseUrl},
        content: 'dummy',
        used: [{dummy: 1}],
        unused: [],
      };
    });

    it('correctly computes potentialSavings', () => {
      assert.equal(map({used: [], unused: [1, 2]}).wastedPercent, 100);
      assert.equal(map({used: [1, 2], unused: [1, 2]}).wastedPercent, 50);
      assert.equal(map({used: [1, 2], unused: []}).wastedPercent, 0);
    });

    it('correctly computes url', () => {
      assert.equal(map({header: {sourceURL: ''}}).url, '*inline*```dummy```');
      assert.equal(map({header: {sourceURL: 'a'}}, 'http://g.co/a').url, '*inline*```dummy```');
      assert.equal(map({header: {sourceURL: 'foobar'}}).url, '/foobar');
    });

    it('does not give content preview when url is present', () => {
      assert.ok(!/dummy/.test(map({header: {sourceURL: 'foobar'}}).url));
    });
  });

  describe('#audit', () => {
    const devtoolsLogs = {defaultPass: []};
    const requestNetworkRecords = () => {
      return Promise.resolve([
        {
          url: 'file://a.css',
          transferSize: 10 * 1024,
          _resourceType: {_name: 'stylesheet'}
        },
      ]);
    };

    it('ignores missing stylesheets', () => {
      return UnusedCSSAudit.audit_({
        devtoolsLogs,
        requestNetworkRecords,
        URL: {finalUrl: ''},
        CSSUsage: [{styleSheetId: 'a', used: false}],
        Styles: []
      }).then(result => {
        assert.equal(result.results.length, 0);
      });
    });

    it('ignores stylesheets that are 100% used', () => {
      return UnusedCSSAudit.audit_({
        devtoolsLogs,
        requestNetworkRecords,
        URL: {finalUrl: ''},
        CSSUsage: [
          {styleSheetId: 'a', used: true},
          {styleSheetId: 'a', used: true},
          {styleSheetId: 'b', used: true},
        ],
        Styles: [
          {
            header: {styleSheetId: 'a', sourceURL: 'file://a.css'},
            content: '.my.selector {color: #ccc;}\n a {color: #fff}'
          },
          {
            header: {styleSheetId: 'b', sourceURL: 'file://b.css'},
            content: '.my.favorite.selector { rule: content; }'
          }
        ]
      }).then(result => {
        assert.equal(result.results.length, 0);
      });
    });

    it('fails when lots of rules are unused', () => {
      return UnusedCSSAudit.audit_({
        devtoolsLogs,
        requestNetworkRecords,
        URL: {finalUrl: ''},
        CSSUsage: [
          {styleSheetId: 'a', used: true},
          {styleSheetId: 'a', used: false},
          {styleSheetId: 'a', used: false},
          {styleSheetId: 'a', used: false},
          {styleSheetId: 'b', used: true},
          {styleSheetId: 'b', used: false},
          {styleSheetId: 'c', used: false},
        ],
        Styles: [
          {
            header: {styleSheetId: 'a', sourceURL: 'file://a.css'},
            content: '.my.selector {color: #ccc;}\n a {color: #fff}'
          },
          {
            header: {styleSheetId: 'b', sourceURL: 'file://b.css'},
            content: `${generate('123', 2050)}`
          },
          {
            header: {styleSheetId: 'c', sourceURL: ''},
            content: `${generate('123', 450)}` // will be filtered out
          }
        ]
      }).then(result => {
        assert.equal(result.results.length, 2);
        assert.equal(result.results[0].totalBytes, 10 * 1024);
        assert.equal(result.results[1].totalBytes, 2050);
        assert.equal(result.results[0].wastedPercent, 75);
        assert.equal(result.results[1].wastedPercent, 50);
      });
    });

    it('does not include duplicate sheets', () => {
      return UnusedCSSAudit.audit_({
        devtoolsLogs,
        requestNetworkRecords,
        URL: {finalUrl: ''},
        CSSUsage: [
          {styleSheetId: 'a', used: true},
          {styleSheetId: 'a', used: true},
          {styleSheetId: 'a', used: false},
          {styleSheetId: 'b', used: false},
        ],
        Styles: [
          {
            header: {styleSheetId: 'a', sourceURL: 'file://a.css'},
            content: '.my.selector {color: #ccc;}\n a {color: #fff}'
          },
          {
            isDuplicate: true,
            header: {styleSheetId: 'b', sourceURL: 'file://b.css'},
            content: 'a.other {color: #fff}'
          },
        ]
      }).then(result => {
        assert.equal(result.results.length, 1);
      });
    });

    it('does not include empty or small sheets', () => {
      return UnusedCSSAudit.audit_({
        devtoolsLogs,
        requestNetworkRecords,
        URL: {finalUrl: ''},
        CSSUsage: [
          {styleSheetId: 'a', used: true},
          {styleSheetId: 'a', used: true},
          {styleSheetId: 'a', used: false},
          {styleSheetId: 'b', used: true},
          {styleSheetId: 'b', used: false},
          {styleSheetId: 'b', used: false},
        ],
        Styles: [
          {
            header: {styleSheetId: 'a', sourceURL: 'file://a.css'},
            content: `${generate('123', 4000)}`
          },
          {
            header: {styleSheetId: 'b', sourceURL: 'file://b.css'},
            content: `${generate('123', 500)}`
          },
          {
            header: {styleSheetId: 'c', sourceURL: 'c.css'},
            content: '@import url(http://googlefonts.com?myfont)'
          },
          {
            header: {styleSheetId: 'd', sourceURL: 'd.css'},
            content: '/* nothing to see here */'
          },
          {
            header: {styleSheetId: 'e', sourceURL: 'e.css'},
            content: '       '
          },
        ]
      }).then(result => {
        assert.equal(result.results.length, 1);
        assert.equal(result.results[0].numUnused, 1);
      });
    });
  });
});
