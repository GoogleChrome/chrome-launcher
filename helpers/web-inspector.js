/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
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
'use strict';

/**
 * Stubbery to allow portions of the DevTools frontend to be used in lighthouse. `WebInspector`
 * technically lives on the global object but should be accessed through a normal `require` call.
 */

// Global pollution.
global.self = global;
global.WebInspector = {};
if (typeof global.window === 'undefined') {
  global.window = global.self = global;
}

// Initialize WebInspector.NetworkManager.
global.Runtime = {};
global.TreeElement = {};
global.WorkerRuntime = {};

global.Protocol = {
  Agents() {}
};
global.WebInspector._moduleSettings = {
  cacheDisabled: {
    addChangeListener() {},
    get() {
      return false;
    }
  },
  monitoringXHREnabled: {
    addChangeListener() {},
    get() {
      return false;
    }
  }
};
global.WebInspector.moduleSetting = function(settingName) {
  return this._moduleSettings[settingName];
};
global.insertionIndexForObjectInListSortedByFunction =
    function(object, list, comparator, insertionIndexAfter) {
      if (insertionIndexAfter) {
        return list.upperBound(object, comparator);
      }

      return list.lowerBound(object, comparator);
    };

// Enum from chromium//src/third_party/WebKit/Source/core/loader/MixedContentChecker.h
global.NetworkAgent = {
  RequestMixedContentType: {
    Blockable: 'blockable',
    OptionallyBlockable: 'optionally-blockable',
    None: 'none'
  },
  BlockedReason: {
    CSP: 'csp',
    MixedContent: 'mixed-content',
    Origin: 'origin',
    Inspector: 'inspector',
    Other: 'other'
  }
};
// Enum from SecurityState enum in protocol's Security domain
global.SecurityAgent = {
  SecurityState: {
    Unknown: 'unknown',
    Neutral: 'neutral',
    Insecure: 'insecure',
    Warning: 'warning',
    Secure: 'secure',
    Info: 'info'
  }
};
// From https://chromium.googlesource.com/chromium/src/third_party/WebKit/Source/devtools/+/master/protocol.json#93
global.PageAgent = {
  ResourceType: {
    Document: 'document',
    Stylesheet: 'stylesheet',
    Image: 'image',
    Media: 'media',
    Font: 'font',
    Script: 'script',
    TextTrack: 'texttrack',
    XHR: 'xhr',
    Fetch: 'fetch',
    EventSource: 'eventsource',
    WebSocket: 'websocket',
    Manifest: 'manifest',
    Other: 'other'
  }
};
// Dependencies for network-recorder
require('chrome-devtools-frontend/front_end/common/Object.js');
require('chrome-devtools-frontend/front_end/common/ParsedURL.js');
require('chrome-devtools-frontend/front_end/common/ResourceType.js');
require('chrome-devtools-frontend/front_end/common/UIString.js');
require('chrome-devtools-frontend/front_end/platform/utilities.js');
require('chrome-devtools-frontend/front_end/sdk/Target.js');
require('chrome-devtools-frontend/front_end/sdk/NetworkManager.js');
require('chrome-devtools-frontend/front_end/sdk/NetworkRequest.js');

// deps for timeline-model
require('devtools-timeline-model/lib/api-stubs.js');
require('chrome-devtools-frontend/front_end/common/SegmentedRange.js');
require('chrome-devtools-frontend/front_end/bindings/TempFile.js');
require('chrome-devtools-frontend/front_end/sdk/TracingModel.js');
require('chrome-devtools-frontend/front_end/timeline/TimelineJSProfile.js');
require('chrome-devtools-frontend/front_end/timeline/TimelineUIUtils.js');
require('chrome-devtools-frontend/front_end/sdk/CPUProfileDataModel.js');
require('chrome-devtools-frontend/front_end/timeline/LayerTreeModel.js');
require('chrome-devtools-frontend/front_end/timeline/TimelineModel.js');
require('chrome-devtools-frontend/front_end/timeline/TimelineTreeView.js');
require('chrome-devtools-frontend/front_end/ui_lazy/SortableDataGrid.js');
require('chrome-devtools-frontend/front_end/timeline/TimelineProfileTree.js');
require('chrome-devtools-frontend/front_end/components_lazy/FilmStripModel.js');
require('chrome-devtools-frontend/front_end/timeline/TimelineIRModel.js');
require('chrome-devtools-frontend/front_end/timeline/TimelineFrameModel.js');

/**
 * Creates a new WebInspector NetworkManager using a mocked Target.
 * @return {!WebInspector.NetworkManager}
 */
global.WebInspector.NetworkManager.createWithFakeTarget = function() {
  // Mocked-up WebInspector Target for NetworkManager
  const fakeNetworkAgent = {
    enable() {}
  };
  const fakeTarget = {
    _modelByConstructor: new Map(),
    networkAgent() {
      return fakeNetworkAgent;
    },
    registerNetworkDispatcher() {}
  };

  global.WebInspector.moduleSetting = function(settingName) {
    return this._moduleSettings[settingName];
  };

  return new global.WebInspector.NetworkManager(fakeTarget);
};

// Initialize WebInspector.Color.
require('chrome-devtools-frontend/front_end/common/Color.js');

module.exports = global.WebInspector;
