/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const UnusedImages =
    require('../../../audits/byte-efficiency/offscreen-images.js');
const assert = require('assert');

/* eslint-env mocha */
function generateRecord(resourceSizeInKb, startTime = 0, mimeType = 'image/png') {
  return {
    mimeType,
    startTime, // DevTools timestamp which is in seconds
    resourceSize: resourceSizeInKb * 1024,
  };
}

function generateSize(width, height, prefix = 'client') {
  const size = {};
  size[`${prefix}Width`] = width;
  size[`${prefix}Height`] = height;
  return size;
}

function generateImage(size, coords, networkRecord, src = 'https://google.com/logo.png') {
  Object.assign(networkRecord || {}, {url: src});

  const x = coords[0];
  const y = coords[1];

  const clientRect = {
    top: y,
    bottom: y + size.clientHeight,
    left: x,
    right: x + size.clientWidth,
  };
  const image = {src, networkRecord, clientRect};
  Object.assign(image, size);
  return image;
}

function generateInteractiveFunc(desiredTimeInSeconds) {
  return () => Promise.resolve({
    timestamp: desiredTimeInSeconds * 1000000
  });
}

describe('OffscreenImages audit', () => {
  const DEFAULT_DIMENSIONS = {innerWidth: 1920, innerHeight: 1080};

  it('handles images without network record', () => {
    return UnusedImages.audit_({
      ViewportDimensions: DEFAULT_DIMENSIONS,
      ImageUsage: [
        generateImage(generateSize(100, 100), [0, 0]),
      ],
      traces: {},
      requestFirstInteractive: generateInteractiveFunc(2),
    }).then(auditResult => {
      assert.equal(auditResult.results.length, 0);
    });
  });

  it('does not find used images', () => {
    const urlB = 'https://google.com/logo2.png';
    const urlC = 'data:image/jpeg;base64,foobar';
    return UnusedImages.audit_({
      ViewportDimensions: DEFAULT_DIMENSIONS,
      ImageUsage: [
        generateImage(generateSize(200, 200), [0, 0], generateRecord(100)),
        generateImage(generateSize(100, 100), [0, 1080], generateRecord(100), urlB),
        generateImage(generateSize(400, 400), [1720, 1080], generateRecord(3), urlC),
      ],
      traces: {},
      requestFirstInteractive: generateInteractiveFunc(2),
    }).then(auditResult => {
      assert.equal(auditResult.results.length, 0);
    });
  });

  it('finds unused images', () => {
    const url = s => `https://google.com/logo${s}.png`;
    return UnusedImages.audit_({
      ViewportDimensions: DEFAULT_DIMENSIONS,
      ImageUsage: [
        // offscreen to the right
        generateImage(generateSize(200, 200), [3000, 0], generateRecord(100)),
        // offscreen to the bottom
        generateImage(generateSize(100, 100), [0, 2000], generateRecord(100), url('B')),
        // offscreen to the top-left
        generateImage(generateSize(100, 100), [-2000, -1000], generateRecord(100), url('C')),
        // offscreen to the bottom-right
        generateImage(generateSize(100, 100), [3000, 2000], generateRecord(100), url('D')),
        // half offscreen to the top, should not warn
        generateImage(generateSize(1000, 1000), [0, -500], generateRecord(100), url('E')),
      ],
      traces: {},
      requestFirstInteractive: generateInteractiveFunc(2),
    }).then(auditResult => {
      assert.equal(auditResult.results.length, 4);
    });
  });

  it('finds images with 0 area', () => {
    return UnusedImages.audit_({
      ViewportDimensions: DEFAULT_DIMENSIONS,
      ImageUsage: [
        generateImage(generateSize(0, 0), [0, 0], generateRecord(100)),
      ],
      traces: {},
      requestFirstInteractive: generateInteractiveFunc(2),
    }).then(auditResult => {
      assert.equal(auditResult.results.length, 1);
    });
  });

  it('de-dupes images', () => {
    const urlB = 'https://google.com/logo2.png';
    return UnusedImages.audit_({
      ViewportDimensions: DEFAULT_DIMENSIONS,
      ImageUsage: [
        generateImage(generateSize(50, 50), [0, 0], generateRecord(50)),
        generateImage(generateSize(1000, 1000), [1000, 1000], generateRecord(50)),
        generateImage(generateSize(50, 50), [0, 1500], generateRecord(200), urlB),
        generateImage(generateSize(400, 400), [0, 1500], generateRecord(90), urlB),
      ],
      traces: {},
      requestFirstInteractive: generateInteractiveFunc(2),
    }).then(auditResult => {
      assert.equal(auditResult.results.length, 1);
    });
  });

  it('disregards images loaded after TTI', () => {
    return UnusedImages.audit_({
      ViewportDimensions: DEFAULT_DIMENSIONS,
      ImageUsage: [
        // offscreen to the right
        generateImage(generateSize(200, 200), [3000, 0], generateRecord(100, 3)),
      ],
      traces: {},
      requestFirstInteractive: generateInteractiveFunc(2),
    }).then(auditResult => {
      assert.equal(auditResult.results.length, 0);
    });
  });
});
