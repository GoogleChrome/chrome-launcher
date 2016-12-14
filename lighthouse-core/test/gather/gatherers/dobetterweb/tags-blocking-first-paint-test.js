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

/* eslint-env mocha */

const TagsBlockingFirstPaint =
    require('../../../../gather/gatherers/dobetterweb/tags-blocking-first-paint');
const assert = require('assert');
let tagsBlockingFirstPaint;
const traceData = {
  networkRecords: [
    {
      _url: 'http://google.com/css/style.css',
      _mimeType: 'text/css',
      _transferSize: 10,
      _startTime: 10,
      _endTime: 10
    },
    {
      _url: 'http://google.com/wc/select.html',
      _mimeType: 'text/html',
      _transferSize: 11,
      _startTime: 11,
      _endTime: 11
    },
    {
      _url: 'http://google.com/js/app.json',
      _mimeType: 'application/json',
      _transferSize: 24,
      _startTime: 24,
      _endTime: 24
    },
    {
      _url: 'http://google.com/js/app.js',
      _mimeType: 'text/javascript',
      _transferSize: 12,
      _startTime: 12,
      _endTime: 22
    }
  ]
};

describe('First paint blocking tags', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    tagsBlockingFirstPaint = new TagsBlockingFirstPaint();
  });

  it('return filtered and indexed requests', () => {
    const actual = tagsBlockingFirstPaint
      ._filteredAndIndexedByUrl(traceData.networkRecords);
    return assert.deepEqual(actual, {
      'http://google.com/css/style.css': {
        transferSize: 10,
        startTime: 10,
        endTime: 10
      },
      'http://google.com/wc/select.html': {
        transferSize: 11,
        startTime: 11,
        endTime: 11
      },
      'http://google.com/js/app.js': {
        transferSize: 12,
        startTime: 12,
        endTime: 22
      }
    });
  });

  it('returns an artifact', () => {
    const linkDetails = {
      tagName: 'LINK',
      url: 'http://google.com/css/style.css',
      href: 'http://google.com/css/style.css',
      disabled: false,
      media: '',
      rel: 'stylesheet'
    };

    const scriptDetails = {
      tagName: 'SCRIPT',
      url: 'http://google.com/js/app.js',
      src: 'http://google.com/js/app.js'
    };

    return tagsBlockingFirstPaint.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve([linkDetails, scriptDetails]);
        }
      }
    }, traceData).then(artifact => {
      const expected = {
        items: [
          {
            tag: linkDetails,
            transferSize: 10,
            spendTime: 0
          },
          {
            tag: scriptDetails,
            transferSize: 12,
            spendTime: 10000
          }
        ],
        total: {
          transferSize: 22,
          spendTime: 10000
        }
      };
      assert.deepEqual(artifact, expected);
    });
  });

  it('handles driver failure', () => {
    return tagsBlockingFirstPaint.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.reject(new Error('such a fail'));
        }
      }
    }, traceData).then(artifact => {
      assert.equal(artifact.value, -1);
      assert.ok(artifact.debugString);
    });
  });
});
