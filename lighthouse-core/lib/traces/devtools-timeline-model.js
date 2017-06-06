/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const WebInspector = require('../web-inspector');
const ConsoleQuieter = require('../console-quieter');

// Polyfill the bottom-up and topdown tree sorting.
const TimelineModelTreeView =
    require('devtools-timeline-model/lib/timeline-model-treeview.js')(WebInspector);

class TimelineModel {

  constructor(events) {
    this.init(events);
  }

  init(events) {
    // (devtools) tracing model
    this._tracingModel =
        new WebInspector.TracingModel(new WebInspector.TempFileBackingStorage('tracing'));
    // timeline model
    this._timelineModel =
        new WebInspector.TimelineModel(WebInspector.TimelineUIUtils.visibleEventsFilter());

    if (typeof events === 'string') {
      events = JSON.parse(events);
    }
    if (events.hasOwnProperty('traceEvents')) {
      events = events.traceEvents;
    }

    // populate with events
    this._tracingModel.reset();

    ConsoleQuieter.mute({prefix: 'timelineModel'});
    this._tracingModel.addEvents(events);
    this._tracingModel.tracingComplete();
    this._timelineModel.setEvents(this._tracingModel);
    ConsoleQuieter.unmuteAndFlush();

    return this;
  }

  _createAggregator() {
    return WebInspector.AggregatedTimelineTreeView.prototype._createAggregator();
  }

  timelineModel() {
    return this._timelineModel;
  }

  tracingModel() {
    return this._tracingModel;
  }

  topDown() {
    const filters = [];
    filters.push(WebInspector.TimelineUIUtils.visibleEventsFilter());
    filters.push(new WebInspector.ExcludeTopLevelFilter());
    const nonessentialEvents = [
      WebInspector.TimelineModel.RecordType.EventDispatch,
      WebInspector.TimelineModel.RecordType.FunctionCall,
      WebInspector.TimelineModel.RecordType.TimerFire
    ];
    filters.push(new WebInspector.ExclusiveNameFilter(nonessentialEvents));

    const topDown = WebInspector.TimelineProfileTree.buildTopDown(
        this._timelineModel.mainThreadEvents(),
        filters, /* startTime */ 0, /* endTime */ Infinity,
        WebInspector.TimelineAggregator.eventId);
    return topDown;
  }

  bottomUp() {
    const topDown = this.topDown();
    const noGrouping = WebInspector.TimelineAggregator.GroupBy.None;
    const noGroupAggregator = this._createAggregator().groupFunction(noGrouping);
    return WebInspector.TimelineProfileTree.buildBottomUp(topDown, noGroupAggregator);
  }

 /**
  * @param  {!string} grouping Allowed values: None Category Subdomain Domain URL EventName
  * @return {!WebInspector.TimelineProfileTree.Node} A grouped and sorted tree
  */
  bottomUpGroupBy(grouping) {
    const topDown = this.topDown();

    const groupSetting = WebInspector.TimelineAggregator.GroupBy[grouping];
    const groupingAggregator = this._createAggregator().groupFunction(groupSetting);
    const bottomUpGrouped =
        WebInspector.TimelineProfileTree.buildBottomUp(topDown, groupingAggregator);

    // sort the grouped tree, in-place
    new TimelineModelTreeView(bottomUpGrouped).sortingChanged('self', 'desc');
    return bottomUpGrouped;
  }

  frameModel() {
    const frameModel = new WebInspector.TimelineFrameModel(event =>
      WebInspector.TimelineUIUtils.eventStyle(event).category.name
    );
    frameModel.addTraceEvents({ /* target */ },
      this._timelineModel.inspectedTargetEvents(), this._timelineModel.sessionId() || '');
    return frameModel;
  }

  filmStripModel() {
    return new WebInspector.FilmStripModel(this._tracingModel);
  }

  interactionModel() {
    const irModel = new WebInspector.TimelineIRModel();
    irModel.populate(this._timelineModel);
    return irModel;
  }

}

module.exports = TimelineModel;
