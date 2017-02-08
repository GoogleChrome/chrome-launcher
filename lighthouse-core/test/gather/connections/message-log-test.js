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

const assert = require('assert');
const MessageLog = require('../../../gather/connections/message-log');

describe('MessageLog', () => {
  let messageLog;
  const pageMsg = {method: 'Page.frameStartedLoading'};
  const networkMsg = {method: 'Network.requestWillBeSent'};
  const otherMsg = {method: 'Storage.cleared'};

  beforeEach(() => messageLog = new MessageLog());

  it('returns an array', () => {
    assert.deepEqual(messageLog.messages, []);
  });

  it('records only when requested', () => {
    messageLog.record(pageMsg); // will not record
    messageLog.beginRecording();
    messageLog.record(networkMsg); // will record
    messageLog.endRecording();
    messageLog.record(pageMsg); // will not record
    assert.equal(messageLog.messages.length, 1);
    assert.equal(messageLog.messages[0].method, networkMsg.method);
  });

  it('does not record non-Network/Page events', () => {
    messageLog.beginRecording();
    messageLog.record(pageMsg); // will record
    messageLog.record(networkMsg); // will record
    messageLog.record(otherMsg); // won't record
    messageLog.endRecording();
    assert.equal(messageLog.messages.length, 2);
    assert.equal(messageLog.messages[0].method, pageMsg.method);
  });

  it('resets properly', () => {
    messageLog.beginRecording();
    messageLog.record(pageMsg);
    messageLog.record(pageMsg);
    messageLog.endRecording();
    messageLog.reset();

    messageLog.beginRecording();
    messageLog.record(pageMsg);
    messageLog.endRecording();
    assert.equal(messageLog.messages.length, 1);
  });
});
