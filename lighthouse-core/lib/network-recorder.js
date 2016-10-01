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

const NetworkManager = require('./web-inspector').NetworkManager;
const EventEmitter = require('events').EventEmitter;
const log = require('../lib/log.js');

class NetworkRecorder extends EventEmitter {
  constructor(recordArray) {
    super();

    this._records = recordArray;
    this.networkManager = NetworkManager.createWithFakeTarget();

    this.startedRequestCount = 0;
    this.finishedRequestCount = 0;

    this.networkManager.addEventListener(this.EventTypes.RequestStarted,
        this.onRequestStarted.bind(this));
    this.networkManager.addEventListener(this.EventTypes.RequestFinished,
        this.onRequestFinished.bind(this));

    this.onRequestWillBeSent = this.onRequestWillBeSent.bind(this);
    this.onRequestServedFromCache = this.onRequestServedFromCache.bind(this);
    this.onResponseReceived = this.onResponseReceived.bind(this);
    this.onDataReceived = this.onDataReceived.bind(this);
    this.onLoadingFinished = this.onLoadingFinished.bind(this);
    this.onLoadingFailed = this.onLoadingFailed.bind(this);
    this.onResourceChangedPriority = this.onResourceChangedPriority.bind(this);
  }

  get EventTypes() {
    return NetworkManager.Events;
  }

  activeRequestCount() {
    return this.startedRequestCount - this.finishedRequestCount;
  }

  isIdle() {
    return this.activeRequestCount() === 0;
  }

  /**
   * Listener for the NetworkManager's RequestStarted event, which includes both
   * web socket and normal request creation.
   * @private
   */
  onRequestStarted() {
    this.startedRequestCount++;

    const activeCount = this.activeRequestCount();
    log.verbose('NetworkRecorder', `Request started. ${activeCount} requests in progress` +
        ` (${this.startedRequestCount} started and ${this.finishedRequestCount} finished).`);

    // If only one request in progress, emit event that we've transitioned from
    // idle to busy.
    if (activeCount === 1) {
      this.emit('networkbusy');
    }
  }

  /**
   * Listener for the NetworkManager's RequestFinished event, which includes
   * request finish, failure, and redirect, as well as the closing of web
   * sockets.
   * @param {!WebInspector.NetworkRequest} request
   * @private
   */
  onRequestFinished(request) {
    this.finishedRequestCount++;
    this._records.push(request.data);
    this.emit('requestloaded', request.data);

    const activeCount = this.activeRequestCount();
    log.verbose('NetworkRecorder', `Request finished. ${activeCount} requests in progress` +
        ` (${this.startedRequestCount} started and ${this.finishedRequestCount} finished).`);

    // If no requests in progress, emit event that we've transitioned from busy
    // to idle.
    if (this.isIdle()) {
      this.emit('networkidle');
    }
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

  onResourceChangedPriority(data) {
    this.networkManager._dispatcher.resourceChangedPriority(data.requestId,
        data.newPriority, data.timestamp);
  }

  static recordsFromLogs(logs) {
    const records = [];
    const nr = new NetworkRecorder(records);
    const dispatcher = method => {
      switch (method) {
        case 'Network.requestWillBeSent': return nr.onRequestWillBeSent;
        case 'Network.requestServedFromCache': return nr.onRequestServedFromCache;
        case 'Network.responseReceived': return nr.onResponseReceived;
        case 'Network.dataReceived': return nr.onDataReceived;
        case 'Network.loadingFinished': return nr.onLoadingFinished;
        case 'Network.loadingFailed': return nr.onLoadingFailed;
        case 'Network.resourceChangedPriority': return nr.onResourceChangedPriority;
        default: return () => {};
      }
    };

    logs.forEach(networkEvent => {
      dispatcher(networkEvent.method)(networkEvent.params);
    });

    return records;
  }
}

module.exports = NetworkRecorder;
