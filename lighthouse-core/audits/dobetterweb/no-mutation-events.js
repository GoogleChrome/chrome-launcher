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
 * @fileoverview Audit a page to see if it is using Mutation Events (and suggest
 *     MutationObservers instead).
 */

'use strict';

const URL = require('../../lib/url-shim');
const Audit = require('../audit');
const EventHelpers = require('../../lib/event-helpers');
const Formatter = require('../../formatters/formatter');

class NoMutationEventsAudit extends Audit {

  static get MUTATION_EVENTS() {
    return [
      'DOMAttrModified',
      'DOMAttributeNameChanged',
      'DOMCharacterDataModified',
      'DOMElementNameChanged',
      'DOMNodeInserted',
      'DOMNodeInsertedIntoDocument',
      'DOMNodeRemoved',
      'DOMNodeRemovedFromDocument',
      'DOMSubtreeModified'
    ];
  }

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'JavaScript',
      name: 'no-mutation-events',
      description: 'Avoids Mutation Events in its own scripts',
      helpText: 'Mutation Events are deprecated and harm performance. Consider using Mutation ' +
          'Observers instead. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/mutation-events).',
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

    const results = listeners.filter(loc => {
      const isMutationEvent = this.MUTATION_EVENTS.includes(loc.type);
      let sameHost = URL.hostsMatch(artifacts.URL.finalUrl, loc.url);

      if (!URL.isValid(loc.url)) {
        sameHost = true;
        debugString = URL.INVALID_URL_DEBUG_STRING;
      }

      return sameHost && isMutationEvent;
    }).map(EventHelpers.addFormattedCodeSnippet);

    const groupedResults = EventHelpers.groupCodeSnippetsByLocation(results);

    return NoMutationEventsAudit.generateAuditResult({
      rawValue: groupedResults.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.TABLE,
        value: {
          results: groupedResults,
          tableHeadings: {url: 'URL', lineCol: 'Line/Col', type: 'Event', code: 'Snippet'}
        }
      },
      debugString
    });
  }
}

module.exports = NoMutationEventsAudit;
