/**
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

/* global WebInspector:false */

// Required for a select portion DevTools frontend to work (in node)
global.self = global;
global.Protocol = {
  Agents() {}
};
global.WebInspector = {
  _moduleSettings: {
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
  },
  moduleSetting: function(settingName) {
    return this._moduleSettings[settingName];
  }
};
// Enum from chromium//src/third_party/WebKit/Source/core/loader/MixedContentChecker.h
global.NetworkAgent = {
  RequestMixedContentType: {
    Blockable: 'blockable',
    OptionallyBlockable: 'optionally-blockable',
    None: 'none'
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

require('chrome-devtools-frontend/front_end/common/Object.js');
require('chrome-devtools-frontend/front_end/common/ParsedURL.js');
require('chrome-devtools-frontend/front_end/common/ResourceType.js');
require('chrome-devtools-frontend/front_end/common/UIString.js');
require('chrome-devtools-frontend/front_end/platform/utilities.js');
require('chrome-devtools-frontend/front_end/sdk/Target.js');
require('chrome-devtools-frontend/front_end/sdk/NetworkManager.js');
require('chrome-devtools-frontend/front_end/sdk/NetworkRequest.js');

// Mocked-up WebInspector Target for NetworkManager
let fakeNetworkAgent = {
  enable() {}
};
let fakeTarget = {
  _modelByConstructor: new Map(),
  networkAgent() {
    return fakeNetworkAgent;
  },
  registerNetworkDispatcher() {}
};

const REQUEST_FINISHED = WebInspector.NetworkManager.EventTypes.RequestFinished;

class NetworkRecorder {
  constructor(recordArray) {
    this._records = recordArray;

    this.networkManager = new WebInspector.NetworkManager(fakeTarget);

    // TODO(bckenny): loadingFailed calls are not recorded in REQUEST_FINISHED.
    this.networkManager.addEventListener(REQUEST_FINISHED, request => {
      this._records.push(request);
    });

    this.onRequestWillBeSent = this.onRequestWillBeSent.bind(this);
    this.onRequestServedFromCache = this.onRequestServedFromCache.bind(this);
    this.onResponseReceived = this.onResponseReceived.bind(this);
    this.onDataReceived = this.onDataReceived.bind(this);
    this.onLoadingFinished = this.onLoadingFinished.bind(this);
    this.onLoadingFailed = this.onLoadingFailed.bind(this);
  }

  // There are a few differences between the debugging protocol naming and
  // the parameter naming used in NetworkManager. These are noted below.

  onRequestWillBeSent(data) {
    // NOTE: data.timestamp -> time, data.type -> resourceType
    this.networkManager._dispatcher.requestWillBeSent(data.requestId,
        data.frameId, data.loaderId, data.documentURL, data.request,
        data.timestamp, data.wallTime, data.initiator, data.redirectResponse,
        data.type);
  }

  onRequestServedFromCache(data) {
    this.networkManager._dispatcher.requestServedFromCache(data.requestId);
  }

  onResponseReceived(data) {
    // NOTE: data.timestamp -> time, data.type -> resourceType
    this.networkManager._dispatcher.responseReceived(data.requestId,
        data.frameId, data.loaderId, data.timestamp, data.type, data.response);
  }

  onDataReceived(data) {
    // NOTE: data.timestamp -> time
    this.networkManager._dispatcher.dataReceived(data.requestId, data.timestamp,
        data.dataLength, data.encodedDataLength);
  }

  onLoadingFinished(data) {
    // NOTE: data.timestamp -> finishTime
    this.networkManager._dispatcher.loadingFinished(data.requestId,
        data.timestamp, data.encodedDataLength);
  }

  onLoadingFailed(data) {
    // NOTE: data.timestamp -> time, data.type -> resourceType,
    // data.errorText -> localizedDescription
    this.networkManager._dispatcher.loadingFailed(data.requestId,
        data.timestamp, data.type, data.errorText, data.canceled,
        data.blockedReason);
  }
}

module.exports = NetworkRecorder;
