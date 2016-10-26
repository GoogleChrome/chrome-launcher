/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
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

/**
 * @fileoverview Tests whether the page is using passive event listeners.
 */

'use strict';

const Gatherer = require('../gatherer');

const LISTENER_LOCATIONS = ['window', 'document', 'document.body'];

class PageLevelEventListeners extends Gatherer {

  listenForScriptParsedEvents() {
    return this.driver.sendCommand('Debugger.enable').then(_ => {
      this.driver.on('Debugger.scriptParsed', script => {
        this._parsedScripts.push(script);
      });
    });
  }

  unlistenForScriptParsedEvents() {
    this.driver.off('Debugger.scriptParsed', this.listenForScriptParsedEvents);
    return this.driver.sendCommand('Debugger.disable');
  }

  /**
   * @param {string} expression An expression to evaluate in the page.
   * @return {!Promise<!Array.<EventListener>>}
   * @private
   */
  _listEventListeners(expression) {
    return this.driver.sendCommand('Runtime.evaluate', {
      expression,
      objectGroup: 'page-listeners-gatherer' // needed to populate .handler
    }).then(result => {
      return this.driver.sendCommand('DOMDebugger.getEventListeners', {
        objectId: result.result.objectId
      });
    });
  }

  /**
   * Collects the event listeners attached to an object and formats the results.
   * listenForScriptParsedEvents should be called before this method to ensure
   * the page's parsed scripts are collected at page load.
   * @param {string} location An object to look for attached event listeners.
   * @return {!Promise<!Array.<Object>>} List of event listeners attached to
   *     location.
   */
  getEventListeners(location) {
    const matchedListeners = [];

    return this._listEventListeners(location).then(results => {
      const parsedScriptIds = this._parsedScripts.map(script => script.scriptId);

      results.listeners.forEach(listener => {
        // Slim down the list of parsed scripts to match the found event
        // listeners that have the same script id.
        const idx = parsedScriptIds.indexOf(listener.scriptId);
        if (idx !== -1) {
          // Combine the EventListener object and the result of the
          // Debugger.scriptParsed event so we get .url and other
          // needed properties.
          const combo = Object.assign(listener, this._parsedScripts[idx]);
          combo.objectId = location;

          // Note: line/col numbers are zero-index. Add one to each so we have
          // actual file line/col numbers.
          combo.line = combo.lineNumber + 1;
          combo.col = combo.columnNumber + 1;

          matchedListeners.push(combo);
        }
      });

      return matchedListeners;
    });
  }

  /**
   * Aggregates the event listeners used on each object into a single list.
   * @param {Array.<string>} locations Objects to look for attached event listeners.
   * @return {!Promise<!Array.<Object>>} Resolves to a list of all the event
   *     listeners found on each object.
   */
  collectListeners(locations) {
    return locations.reduce((chain, location) => {
      return chain.then(prevArr => {
        return this.getEventListeners(location).then(results => {
          return prevArr.concat(results);
        });
      });
    }, Promise.resolve([]));
  }

  beforePass(options) {
    this.driver = options.driver;
    this._parsedScripts = [];
    return this.listenForScriptParsedEvents();
  }

  afterPass(options) {
    return this.unlistenForScriptParsedEvents(options.driver)
      .then(_ => this.collectListeners(LISTENER_LOCATIONS))
      .then(listeners => {
        this.artifact = listeners;
      }).catch(_ => {
        this.artifact = {
          usage: -1,
          debugString: 'Unable to gather passive events listeners usage.'
        };
      });
  }
}

module.exports = PageLevelEventListeners;
