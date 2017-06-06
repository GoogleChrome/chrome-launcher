/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const TTFI = require('./first-interactive');
const TTCI = require('./consistently-interactive');
const jpeg = require('jpeg-js');

const NUMBER_OF_THUMBNAILS = 10;
const THUMBNAIL_WIDTH = 60;

class ScreenshotThumbnails extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Images',
      name: 'screenshot-thumbnails',
      informative: true,
      description: 'Screenshot Thumbnails',
      helpText: 'This is what the load of your site looked like.',
      requiredArtifacts: ['traces']
    };
  }

  /**
   * Scales down an image to THUMBNAIL_WIDTH using nearest neighbor for speed, maintains aspect
   * ratio of the original thumbnail.
   *
   * @param {{width: number, height: number, data: !Array<number>}} imageData
   * @return {{width: number, height: number, data: !Array<number>}}
   */
  static scaleImageToThumbnail(imageData) {
    const scaledWidth = THUMBNAIL_WIDTH;
    const scaleFactor = imageData.width / scaledWidth;
    const scaledHeight = Math.floor(imageData.height / scaleFactor);

    const outPixels = new Uint8Array(scaledWidth * scaledHeight * 4);

    for (let i = 0; i < scaledWidth; i++) {
      for (let j = 0; j < scaledHeight; j++) {
        const origX = Math.floor(i * scaleFactor);
        const origY = Math.floor(j * scaleFactor);

        const origPos = (origY * imageData.width + origX) * 4;
        const outPos = (j * scaledWidth + i) * 4;

        outPixels[outPos] = imageData.data[origPos];
        outPixels[outPos + 1] = imageData.data[origPos + 1];
        outPixels[outPos + 2] = imageData.data[origPos + 2];
        outPixels[outPos + 3] = imageData.data[origPos + 3];
      }
    }

    return {
      width: scaledWidth,
      height: scaledHeight,
      data: outPixels,
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const cachedThumbnails = new Map();

    return Promise.all([
      artifacts.requestSpeedline(trace),
      TTFI.audit(artifacts).catch(() => ({rawValue: 0})),
      TTCI.audit(artifacts).catch(() => ({rawValue: 0})),
    ]).then(([speedline, ttfi, ttci]) => {
      const thumbnails = [];
      const analyzedFrames = speedline.frames.filter(frame => !frame.isProgressInterpolated());
      // Find thumbnails to cover the full range of the trace (max of last visual change and time
      // to interactive).
      const timelineEnd = Math.max(speedline.complete, ttfi.rawValue, ttci.rawValue);

      for (let i = 1; i <= NUMBER_OF_THUMBNAILS; i++) {
        const targetTimestamp = speedline.beginning + timelineEnd * i / NUMBER_OF_THUMBNAILS;

        let frameForTimestamp = null;
        if (i === NUMBER_OF_THUMBNAILS) {
          frameForTimestamp = analyzedFrames[analyzedFrames.length - 1];
        } else {
          analyzedFrames.forEach(frame => {
            if (frame.getTimeStamp() <= targetTimestamp) {
              frameForTimestamp = frame;
            }
          });
        }

        const imageData = frameForTimestamp.getParsedImage();
        const thumbnailImageData = ScreenshotThumbnails.scaleImageToThumbnail(imageData);
        const base64Data = cachedThumbnails.get(frameForTimestamp) ||
            jpeg.encode(thumbnailImageData, 90).data.toString('base64');

        cachedThumbnails.set(frameForTimestamp, base64Data);
        thumbnails.push({
          timing: Math.round(targetTimestamp - speedline.beginning),
          timestamp: targetTimestamp * 1000,
          data: base64Data,
        });
      }

      return {
        score: 100,
        rawValue: thumbnails.length > 0,
        details: {
          type: 'filmstrip',
          scale: timelineEnd,
          items: thumbnails,
        },
      };
    });
  }
}

module.exports = ScreenshotThumbnails;
