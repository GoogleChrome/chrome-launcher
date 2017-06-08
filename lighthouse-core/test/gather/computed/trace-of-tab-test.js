/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TraceOfTab = require('../../../gather/computed/trace-of-tab');
const traceOfTab = new TraceOfTab();

const assert = require('assert');
const badNavStartTrace = require('../../fixtures/traces/bad-nav-start-ts.json');
const lateTracingStartedTrace = require('../../fixtures/traces/tracingstarted-after-navstart.json');
const preactTrace = require('../../fixtures/traces/preactjs.com_ts_of_undefined.json');
const noFMPtrace = require('../../fixtures/traces/no_fmp_event.json');
const noFCPtrace = require('../../fixtures/traces/airhorner_no_fcp');
const backgroundTabTrace = require('../../fixtures/traces/backgrounded-tab-missing-paints');

/* eslint-env mocha */
describe('Trace of Tab computed artifact:', () => {
  it('gathers the events from the tab\'s process', () => {
    const trace = traceOfTab.compute_(lateTracingStartedTrace);

    const firstEvt = trace.processEvents[0];
    trace.processEvents.forEach(evt => {
      assert.equal(evt.pid, firstEvt.pid, 'A traceEvent is found from another process');
    });

    assert.ok(firstEvt.pid === trace.startedInPageEvt.pid);
    assert.ok(firstEvt.pid === trace.navigationStartEvt.pid);
    assert.ok(firstEvt.pid === trace.firstContentfulPaintEvt.pid);
    assert.ok(firstEvt.pid === trace.firstMeaningfulPaintEvt.pid);
  });

  it('computes timings of each event', () => {
    const trace = traceOfTab.compute_(lateTracingStartedTrace);
    assert.equal(Math.round(trace.timings.navigationStart), 0);
    assert.equal(Math.round(trace.timings.firstPaint), 80);
    assert.equal(Math.round(trace.timings.firstContentfulPaint), 80);
    assert.equal(Math.round(trace.timings.firstMeaningfulPaint), 530);
    assert.equal(Math.round(trace.timings.traceEnd), 649);
  });

  it('computes timestamps of each event', () => {
    const trace = traceOfTab.compute_(lateTracingStartedTrace);
    assert.equal(Math.round(trace.timestamps.navigationStart), 29343540951);
    assert.equal(Math.round(trace.timestamps.firstPaint), 29343620997);
    assert.equal(Math.round(trace.timestamps.firstContentfulPaint), 29343621005);
    assert.equal(Math.round(trace.timestamps.firstMeaningfulPaint), 29344070867);
    assert.equal(Math.round(trace.timestamps.traceEnd), 29344190223);
  });

  describe('finds correct FMP', () => {
    it('if there was a tracingStartedInPage after the frame\'s navStart', () => {
      const trace = traceOfTab.compute_(lateTracingStartedTrace);
      assert.equal(trace.startedInPageEvt.ts, 29343544280);
      assert.equal(trace.navigationStartEvt.ts, 29343540951);
      assert.equal(trace.firstContentfulPaintEvt.ts, 29343621005);
      assert.equal(trace.firstMeaningfulPaintEvt.ts, 29344070867);
    });

    it('if there was a tracingStartedInPage after the frame\'s navStart #2', () => {
      const trace = traceOfTab.compute_(badNavStartTrace);
      assert.equal(trace.startedInPageEvt.ts, 8885435611);
      assert.equal(trace.navigationStartEvt.ts, 8885424467);
      assert.equal(trace.firstContentfulPaintEvt.ts, 8886056886);
      assert.equal(trace.firstMeaningfulPaintEvt.ts, 8886056891);
    });

    it('if it appears slightly before the fCP', () => {
      const trace = traceOfTab.compute_(preactTrace);
      assert.equal(trace.startedInPageEvt.ts, 1805796376829);
      assert.equal(trace.navigationStartEvt.ts, 1805796384607);
      assert.equal(trace.firstContentfulPaintEvt.ts, 1805797263653);
      assert.equal(trace.firstMeaningfulPaintEvt.ts, 1805797262960);
    });

    it('from candidates if no defined FMP exists', () => {
      const trace = traceOfTab.compute_(noFMPtrace);
      assert.equal(trace.startedInPageEvt.ts, 2146735802456);
      assert.equal(trace.navigationStartEvt.ts, 2146735807738);
      assert.equal(trace.firstContentfulPaintEvt.ts, 2146737302468);
      assert.equal(trace.firstMeaningfulPaintEvt.ts, 2146740268666);
    });
  });

  it('handles traces missing an FCP', () => {
    const trace = traceOfTab.compute_(noFCPtrace);
    assert.equal(trace.startedInPageEvt.ts, 2149509117532, 'bad tracingstartedInPage');
    assert.equal(trace.navigationStartEvt.ts, 2149509122585, 'bad navStart');
    assert.equal(trace.firstContentfulPaintEvt, undefined, 'bad fcp');
    assert.equal(trace.firstMeaningfulPaintEvt.ts, 2149509604903, 'bad fmp');
  });

  it('handles traces missing a paints (captured in background tab)', () => {
    const trace = traceOfTab.compute_(backgroundTabTrace);
    assert.equal(trace.startedInPageEvt.ts, 1966813248134);
    assert.notEqual(trace.navigationStartEvt.ts, 1966813346529, 'picked wrong frame');
    assert.notEqual(trace.navigationStartEvt.ts, 1966813520313, 'picked wrong frame');
    assert.equal(
      trace.navigationStartEvt.ts,
      1966813258737,
      'didnt select navStart event with same timestamp as usertiming measure'
    );
    assert.equal(trace.firstContentfulPaintEvt, undefined, 'bad fcp');
    assert.equal(trace.firstMeaningfulPaintEvt, undefined, 'bad fmp');
  });
});
