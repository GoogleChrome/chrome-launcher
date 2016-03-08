/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function enable () {
  // Sets some global options so that the trace viewer code can work.
  // It expects to be run inside of a browser, where host objects
  // (and Polymer) exist. Since they don't they need stubbing out.
  global.Polymer = function () {};
  global.Polymer.elements = {};

  global.HTMLUnknownElement = {};
  global.HTMLDivElement = {};
  global.document = {
    currentScript: {
      ownerDocument: {}
    },

    createElement: function () {
      return {
        style: {

        }
      };
    }
  };

  global.vec2 = {create: function () {}, set: function () {}};
  global.vec3 = {create: function () {}};
  global.vec4 = {create: function () {}};
  global.mat2d = {create: function () {}};
  global.mat4 = {create: function () {}};
  global.window = {
    performance: {
      now: function () {
        return Date.now();
      }
    }, webkitRequestAnimationFrame: function (cb) {
      cb();
    }, requestAnimationFrame: function (cb) {
      cb();
    }
  };
}

function disable () {

  delete global.Polymer.elements;
  delete global.Polymer;

  delete global.HTMLUnknownElement;
  delete global.HTMLDivElement;
  delete global.document;

  delete global.vec2;
  delete global.vec3;
  delete global.vec4;
  delete global.mat2d;
  delete global.mat4;
  delete global.window;
}

module.exports = {
  enable: enable,
  disable: disable
};
