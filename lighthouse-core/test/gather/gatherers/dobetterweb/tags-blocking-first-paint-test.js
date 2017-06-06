/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
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
      _endTime: 10,
      finished: true,
      isLinkPreload: false,
      _initiator: {type: 'parser'}
    },
    {
      _url: 'http://google.com/wc/select.html',
      _mimeType: 'text/html',
      _transferSize: 11,
      _startTime: 11,
      _endTime: 11,
      finished: true,
      isLinkPreload: false,
      _initiator: {type: 'other'}
    },
    {
      _url: 'http://google.com/js/app.json',
      _mimeType: 'application/json',
      _transferSize: 24,
      _startTime: 24,
      _endTime: 24,
      finished: true,
      isLinkPreload: false,
      _initiator: {type: 'script'}
    },
    {
      _url: 'http://google.com/js/app.js',
      _mimeType: 'text/javascript',
      _transferSize: 12,
      _startTime: 12,
      _endTime: 22,
      finished: true,
      isLinkPreload: false,
      _initiator: {type: 'parser'}
    },
    {
      _url: 'http://google.com/wc/import.html',
      _mimeType: 'text/html',
      _transferSize: 13,
      _startTime: 13,
      _endTime: 13,
      finished: true,
      isLinkPreload: false,
      _initiator: {type: 'script'}
    },
    {
      _url: 'http://google.com/css/ignored.css',
      _mimeType: 'text/css',
      _transferSize: 16,
      _startTime: 16,
      _endTime: 16,
      finished: true,
      isLinkPreload: true,
      _initiator: {type: 'script'}
    },
    {
      _url: 'http://google.com/js/ignored.js',
      _mimeType: 'text/javascript',
      _transferSize: 16,
      _startTime: 16,
      _endTime: 16,
      finished: true,
      isLinkPreload: false,
      _initiator: {type: 'script'}
    },
    {
      _url: 'http://google.com/js/also-ignored.js',
      _mimeType: 'text/javascript',
      _transferSize: 12,
      _startTime: 12,
      _endTime: 22,
      finished: false,
      isLinkPreload: false,
      _initiator: {type: 'parser'}
    },
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
        isLinkPreload: false,
        transferSize: 10,
        startTime: 10,
        endTime: 10
      },
      'http://google.com/wc/select.html': {
        isLinkPreload: false,
        transferSize: 11,
        startTime: 11,
        endTime: 11
      },
      'http://google.com/js/app.js': {
        isLinkPreload: false,
        transferSize: 12,
        startTime: 12,
        endTime: 22
      },
      'http://google.com/wc/import.html': {
        isLinkPreload: false,
        transferSize: 13,
        startTime: 13,
        endTime: 13
      },
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
          return Promise.resolve([linkDetails, linkDetails, scriptDetails]);
        }
      }
    }, traceData).then(artifact => {
      const expected = [
        {
          tag: linkDetails,
          transferSize: 10,
          startTime: 10,
          endTime: 10
        },
        {
          tag: scriptDetails,
          transferSize: 12,
          startTime: 12,
          endTime: 22
        }
      ];
      assert.deepEqual(artifact, expected);
    });
  });
});
