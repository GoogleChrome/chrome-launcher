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
 * @fileoverview Audit a page to see if it is using passive event listeners on
 * scroll-blocking touch and wheel event listeners.
 */

'use strict';

const URL = require('../../lib/url-shim');
const Audit = require('../audit');
const EventHelpers = require('../../lib/event-helpers');
const Formatter = require('../../formatters/formatter');

class PassiveEventsAudit extends Audit {

  static get SCROLL_BLOCKING_EVENTS() {
    // See https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
    return ['wheel', 'mousewheel', 'touchstart', 'touchmove'];
  }

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'JavaScript',
      name: 'uses-passive-event-listeners',
      description: 'Uses passive listeners to improve scrolling performance',
      helpText: 'Consider marking your touch and wheel event listeners as `passive` ' +
          'to improve your page\'s scroll performance. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/passive-event-listeners).',
      requiredArtifacts: ['URL', 'EventListeners']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    let debugString;
    const listeners = artifacts.EventListeners;

    // Flags all touch and wheel listeners that 1) are from same host
    // 2) are not passive 3) do not call preventDefault()
    const results = listeners.filter(loc => {
      const isScrollBlocking = this.SCROLL_BLOCKING_EVENTS.includes(loc.type);
      const mentionsPreventDefault = loc.handler.description.match(
            /\.preventDefault\(\s*\)/g);
      let sameHost = URL.hostsMatch(artifacts.URL.finalUrl, loc.url);

      if (!URL.isValid(loc.url)) {
        sameHost = true;
        debugString = URL.INVALID_URL_DEBUG_STRING;
      }

      return sameHost && isScrollBlocking && !loc.passive &&
             !mentionsPreventDefault;
    }).map(EventHelpers.addFormattedCodeSnippet);

    const groupedResults = EventHelpers.groupCodeSnippetsByLocation(results);

    return PassiveEventsAudit.generateAuditResult({
      rawValue: groupedResults.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.TABLE,
        value: {
          results: groupedResults,
          tableHeadings: {url: 'URL', lineCol: 'Line/Col', type: 'Type', pre: 'Snippet'}
        }
      },
      debugString
    });
  }
}

module.exports = PassiveEventsAudit;
