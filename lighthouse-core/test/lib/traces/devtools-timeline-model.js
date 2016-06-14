'use strict';

/* global describe, it */

const fs = require('fs');
const assert = require('assert');
const TimelineModel = require('../../../lib/traces/devtools-timeline-model');

const filename = 'devtools-homepage-w-screenshots-trace.json';
const events = fs.readFileSync('./test/fixtures/traces/' + filename, 'utf8');
let model;

describe('DevTools Timeline Model', function() {
  it('doesn\'t throw an exception', () => {
    assert.doesNotThrow(_ => {
      model = new TimelineModel(events);
    });
  });

  // We're not sandboxing so we don't expect conflicts of multiple instances
  // So this test is somewhat unneccessary, but we'll keep it for the good of the order
  it('Multiple instances don\'t conflict', () => {
    let model1;
    let model2;
    assert.doesNotThrow(_ => {
      model1 = new TimelineModel(events);
      model2 = new TimelineModel(events);
    });
    const events1 = model1.timelineModel().mainThreadEvents().length;
    const events2 = model2.timelineModel().mainThreadEvents().length;
    assert.equal(events1, events2);
  });

  it('metrics returned are expected', () => {
    assert.equal(model.timelineModel().mainThreadEvents().length, 7228);
    assert.equal(model.interactionModel().interactionRecords().length, 0);
    assert.equal(model.frameModel().frames().length, 16);
  });

  it('top-down profile', () => {
    const leavesCount = model.topDown().children.size;
    assert.equal(leavesCount, 28);
    const time = model.topDown().totalTime.toFixed(2);
    assert.equal(time, '559.21');
  });

  it('bottom-up profile', () => {
    const leavesCount = model.bottomUp().children.size;
    assert.equal(leavesCount, 243);
    const topCosts = [...model.bottomUpGroupBy('URL').children.values()];
    const time = topCosts[1].totalTime.toFixed(2);
    const url = topCosts[1].id;
    assert.equal(time, '80.77');
    assert.equal(url, 'https://s.ytimg.com/yts/jsbin/www-embed-lightweight-vflu_2b1k/www-embed-lightweight.js');
  });

  it('bottom-up profile - group by eventname', () => {
    const bottomUpByName = model.bottomUpGroupBy('EventName');
    const leavesCount = bottomUpByName.children.size;
    assert.equal(leavesCount, 15);
    const topCosts = [...bottomUpByName.children.values()];
    const time = topCosts[0].selfTime.toFixed(2);
    const name = topCosts[0].id;
    assert.equal(time, '187.75');
    assert.equal(name, 'Layout');
  });
});
