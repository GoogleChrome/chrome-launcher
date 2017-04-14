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

/* eslint-env mocha */

const ResponseCompression =
    require('../../../../gather/gatherers/dobetterweb/response-compression');
const assert = require('assert');

let options;
let optimizedResponses;
const traceData = {
  networkRecords: [
    {
      _url: 'http://google.com/index.js',
      _mimeType: 'text/javascript',
      _resourceSize: 9,
      _resourceType: {
        _isTextType: true,
      },
      _responseHeaders: [{
        name: 'Content-Encoding',
        value: 'gzip',
      }],
      content: 'aaabbbccc',
    },
    {
      _url: 'http://google.com/index.css',
      _mimeType: 'text/css',
      _resourceSize: 6,
      _resourceType: {
        _isTextType: true,
      },
      _responseHeaders: [],
      content: 'abcabc',
    },
    {
      _url: 'http://google.com/index.json',
      _mimeType: 'application/json',
      _resourceSize: 7,
      _resourceType: {
        _isTextType: true,
      },
      _responseHeaders: [],
      content: '1234567',
    },
    {
      _url: 'http://google.com/index.jpg',
      _mimeType: 'images/jpg',
      _resourceSize: 10,
      _resourceType: {
        _isTextType: false,
      },
      _responseHeaders: [],
      content: 'aaaaaaaaaa',
    }
  ]
};

describe('Optimized responses', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    optimizedResponses = new ResponseCompression();
    options = {
      url: 'http://google.com/',
    };
  });

  it('returns only text and non encoded responses', () => {
    return optimizedResponses.afterPass(options, createNetworkRequests(traceData))
      .then(artifact => {
        assert.equal(artifact.length, 2);
        assert.ok(/index\.css$/.test(artifact[0].url));
        assert.ok(/index\.json$/.test(artifact[1].url));
      });
  });

  it('computes sizes', () => {
    return optimizedResponses.afterPass(options, createNetworkRequests(traceData))
      .then(artifact => {
        assert.equal(artifact.length, 2);
        assert.equal(artifact[0].resourceSize, 6);
        assert.equal(artifact[0].gzipSize, 26);
      });
  });

 // Change into SDK.networkRequest when examples are ready
  function createNetworkRequests(traceData) {
    traceData.networkRecords = traceData.networkRecords.map(record => {
      record.url = record._url;
      record.mimeType = record._mimeType;
      record.resourceSize = record._resourceSize;
      record.responseHeaders = record._responseHeaders;
      record.requestContent = () => Promise.resolve(record.content);
      record.resourceType = () => {
        return Object.assign(
          {
            isTextType: () => record._resourceType._isTextType
          },
          record._resourceType
        );
      };

      return record;
    });

    return traceData;
  }
});
