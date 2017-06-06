/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const OptimizedImages =
    require('../../../../gather/gatherers/dobetterweb/optimized-images');
const assert = require('assert');

let options;
let optimizedImages;
const fakeImageStats = {
  jpeg: {base64: 100, binary: 80},
  webp: {base64: 80, binary: 60},
};
const traceData = {
  networkRecords: [
    {
      _url: 'http://google.com/image.jpg',
      _mimeType: 'image/jpeg',
      _resourceSize: 10,
      finished: true,
    },
    {
      _url: 'http://google.com/transparent.png',
      _mimeType: 'image/png',
      _resourceSize: 11,
      finished: true,
    },
    {
      _url: 'http://google.com/image.bmp',
      _mimeType: 'image/bmp',
      _resourceSize: 12,
      finished: true,
    },
    {
      _url: 'http://google.com/image.bmp',
      _mimeType: 'image/bmp',
      _resourceSize: 12,
      finished: true,
    },
    {
      _url: 'http://google.com/vector.svg',
      _mimeType: 'image/svg+xml',
      _resourceSize: 13,
      finished: true,
    },
    {
      _url: 'http://gmail.com/image.jpg',
      _mimeType: 'image/jpeg',
      _resourceSize: 15,
      finished: true,
    },
    {
      _url: 'data: image/jpeg ; base64 ,SgVcAT32587935321...',
      _mimeType: 'image/jpeg',
      _resourceSize: 14,
      finished: true,
    },
    {
      _url: 'http://google.com/big-image.bmp',
      _mimeType: 'image/bmp',
      _resourceSize: 12,
      finished: false, // ignore for not finishing
    },
  ]
};

describe('Optimized images', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    optimizedImages = new OptimizedImages();
    options = {
      url: 'http://google.com/',
      driver: {
        evaluateAsync: function() {
          return Promise.resolve(fakeImageStats);
        },
        sendCommand: function() {
          return Promise.resolve({base64Encoded: true, body: 'mydata'});
        },
      }
    };
  });

  it('returns all images', () => {
    return optimizedImages.afterPass(options, traceData).then(artifact => {
      assert.equal(artifact.length, 4);
      assert.ok(/image.jpg/.test(artifact[0].url));
      assert.ok(/transparent.png/.test(artifact[1].url));
      assert.ok(/image.bmp/.test(artifact[2].url));
      // skip cross-origin for now
      // assert.ok(/gmail.*image.jpg/.test(artifact[3].url));
      assert.ok(/data: image/.test(artifact[3].url));
    });
  });

  it('computes sizes', () => {
    const checkSizes = (stat, original, webp, jpeg) => {
      assert.equal(stat.originalSize, original);
      assert.equal(stat.webpSize, webp);
      assert.equal(stat.jpegSize, jpeg);
    };

    return optimizedImages.afterPass(options, traceData).then(artifact => {
      assert.equal(artifact.length, 4);
      checkSizes(artifact[0], 10, 60, 80);
      checkSizes(artifact[1], 11, 60, 80);
      checkSizes(artifact[2], 12, 60, 80);
      // skip cross-origin for now
      // checkSizes(artifact[3], 15, 60, 80);
      checkSizes(artifact[3], 20, 80, 100); // uses base64 data
    });
  });

  it('handles partial driver failure', () => {
    let calls = 0;
    options.driver.evaluateAsync = () => {
      calls++;
      if (calls > 2) {
        return Promise.reject(new Error('whoops driver failed'));
      } else {
        return Promise.resolve(fakeImageStats);
      }
    };

    return optimizedImages.afterPass(options, traceData).then(artifact => {
      const failed = artifact.find(record => record.failed);

      assert.equal(artifact.length, 4);
      assert.ok(failed, 'passed along failure');
      assert.ok(/whoops/.test(failed.err.message), 'passed along error message');
    });
  });
});
