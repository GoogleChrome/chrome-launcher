'use strict';

/* global describe, it */

var fs = require('fs');
var expect = require('chai').expect;
var bigrig = require('../');

describe('Big Rig', function () {

  it ('throws if no processes are found', function () {

    expect(function () {
      bigrig.analyze(null);
    }).to.throw('Zero processes (tabs) found.');

  });

  it ('throws if given invalid input data is given', function () {

    expect(function () {
      bigrig.analyze('wobble');
    }).to.throw('Invalid trace contents; not JSON');

  });

  it ('throws if given a trace with extensions and strict mode is enabled',
    function (done) {

      fs.readFile('./test/data/load-extensions.json', 'utf8',

        function (err, data) {

          if (err) {
            throw err;
          }

          var error = 'Extensions running during capture; ' +
              'see http://bit.ly/bigrig-extensions';

          expect(function () {
            bigrig.analyze(data, {
              strict: true
            });
          }).to.throw(error);

          done();
        });

    });

  // TODO(paullewis) Add multiprocess test.

  it ('returns JSON for a file with a single process', function (done) {

    fs.readFile('./test/data/load.json', 'utf8',
      function (err, data) {

        if (err) {
          throw err;
        }

        var jsonData = bigrig.analyze(data);

        expect(jsonData).to.be.an('array');
        expect(jsonData[0]).to.be.an('object');
        done();

      });
  });

  it ('generates valid JSON', function (done) {

    fs.readFile('./test/data/load.json', 'utf8',
      function (err, data) {

        if (err) {
          throw err;
        }

        var jsonData = bigrig.analyze(data);
        jsonData = JSON.parse(JSON.stringify(jsonData));

        expect(jsonData).to.be.an('array');
        done();

      });
  });

  it ('supports timed ranges', function (done) {

    fs.readFile('./test/data/animation.json', 'utf8',
      function (err, data) {

        if (err) {
          throw err;
        }

        var jsonData = bigrig.analyze(data);

        expect(jsonData[0]).to.be.an('object');
        expect(jsonData[0].title).to.equal('sideNavAnimation');
        expect(jsonData[0].start).to.be.above(0);
        expect(jsonData[0].end).to.be.within(1179, 1180);
        done();

      });
  });

  it ('correctly applies RAIL type when time range is specified',

    function (done) {

      fs.readFile('./test/data/animation.json', 'utf8',
        function (err, data) {

          if (err) {
            throw err;
          }

          var jsonData = bigrig.analyze(data, {
            types: {
              'sideNavAnimation': bigrig.ANIMATION
            }
          });

          expect(jsonData[0].type).to.equal(bigrig.ANIMATION);
          done();

        });
    });

  it ('correctly infers RAIL Load when time range not specified',
    function (done) {

      fs.readFile('./test/data/load.json', 'utf8',
        function (err, data) {

          if (err) {
            throw err;
          }

          var jsonData = bigrig.analyze(data);
          expect(jsonData[0].type).to.equal(bigrig.LOAD);
          expect(jsonData[0].title).to.equal('Load');
          done();

        });
    });

  it ('correctly infers RAIL Response when time range not specified',
    function (done) {

      fs.readFile('./test/data/response.json', 'utf8',
        function (err, data) {

          if (err) {
            throw err;
          }

          var jsonData = bigrig.analyze(data);
          expect(jsonData[0].type).to.equal(bigrig.RESPONSE);
          expect(jsonData[0].title).to.equal('sideNavResponse');
          done();

        });
    });

  it ('correctly infers RAIL Animation when time range not specified',
    function (done) {

      fs.readFile('./test/data/animation.json', 'utf8',
        function (err, data) {

          if (err) {
            throw err;
          }

          var jsonData = bigrig.analyze(data);
          expect(jsonData[0].type).to.equal(bigrig.ANIMATION);
          expect(jsonData[0].title).to.equal('sideNavAnimation');
          done();

        });
    });

  it ('correctly infers multiple RAIL regions', function (done) {

    fs.readFile('./test/data/response-animation.json', 'utf8',
      function (err, data) {

        if (err) {
          throw err;
        }

        var jsonData = bigrig.analyze(data);

        expect(jsonData.length).to.equal(2);

        expect(jsonData[0].type).to.equal(bigrig.RESPONSE);
        expect(jsonData[0].title).to.equal('sideNavResponse');

        expect(jsonData[1].type).to.equal(bigrig.ANIMATION);
        expect(jsonData[1].title).to.equal('sideNavAnimation');

        done();

      });
  });

  it ('returns the correct fps for animations', function (done) {

    fs.readFile('./test/data/animation.json', 'utf8',
      function (err, data) {

        if (err) {
          throw err;
        }

        var jsonData = bigrig.analyze(data);
        expect(jsonData[0].fps).to.be.within(59, 61);
        done();

      });
  });

  it ('returns the correct JS breakdown', function (done) {

    fs.readFile('./test/data/load.json', 'utf8',
      function (err, data) {

        if (err) {
          throw err;
        }

        var jsonData = bigrig.analyze(data);
        expect(
          jsonData[0].extendedInfo.javaScript['localhost:11080']
        ).to.be.within(245, 246);
        expect(
          jsonData[0].extendedInfo.javaScript['www.google-analytics.com']
        ).to.be.within(59, 60);
        done();

      });
  });

  it ('correctly captures forced layouts and recalcs', function (done) {

    fs.readFile('./test/data/forced-recalc-layout.json', 'utf8',
      function (err, data) {

        if (err) {
          throw err;
        }

        var jsonData = bigrig.analyze(data);
        expect(
          jsonData[0].extendedInfo.forcedRecalcs
        ).to.equal(1);
        expect(
          jsonData[0].extendedInfo.forcedLayouts
        ).to.equal(1);
        done();

      });
  });
});
