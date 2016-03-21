/**
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

import {ManifestParser} from './manifest-parser.js';

var hasManifest = _ => {
  return !!document.querySelector('link[rel=manifest]');
};

var parseManifest = function() {
  var link = document.querySelector('link[rel=manifest]');

  if (!link) {
    return {};
  }

  var request = new XMLHttpRequest();
  request.open('GET', link.href, false);  // `false` makes the request synchronous
  request.send(null);

  if (request.status === 200) {
    /* eslint-disable new-cap*/
    let parserInstance = (window.__lighthouse.ManifestParser)();
    /* eslint-enable new-cap*/
    parserInstance.parse(request.responseText);
    return parserInstance.manifest();
  }

  throw new Error('Unable to fetch manifest at ' + link);
};

var hasManifestThemeColor = _ => {
  let manifest = __lighthouse.parseManifest();

  return !!manifest.theme_color;
};

var hasManifestBackgroundColor = _ => {
  let manifest = __lighthouse.parseManifest();

  return !!manifest.background_color;
};

var hasManifestIcons = _ => {
  let manifest = __lighthouse.parseManifest();

  return !!manifest.icons;
};

var hasManifestIcons192 = _ => {
  let manifest = __lighthouse.parseManifest();

  if (!manifest.icons) {
    return false;
  }

  return !!manifest.icons.find(function(i) {
    return i.sizes.has('192x192');
  });
};

var hasManifestShortName = _ => {
  let manifest = __lighthouse.parseManifest();

  return !!manifest.short_name;
};

var hasManifestName = _ => {
  let manifest = __lighthouse.parseManifest();

  return !!manifest.name;
};

var hasManifestStartUrl = _ => {
  let manifest = __lighthouse.parseManifest();

  return !!manifest.start_url;
};

var hasCanonicalUrl = _ => {
  var link = document.querySelector('link[rel=canonical]');

  return !!link;
};

var hasServiceWorkerRegistration = _ => {
  return new Promise((resolve, reject) => {
    navigator.serviceWorker.getRegistration().then(r => {
      // Fail immediately for non-existent registrations.
      if (typeof r === 'undefined') {
        return resolve(false);
      }

      // If there's an active SW call this done.
      if (r.active) {
        return resolve(!!r.active);
      }

      // Give any installing SW chance to install.
      r.installing.onstatechange = function() {
        resolve(this.state === 'installed');
      };
    }).catch(_ => {
      resolve(false);
    });
  });
};

var isOnHTTPS = _ => location.protocol === 'https:';

function injectIntoTab(chrome, fnPair) {
  var singleLineFn = fnPair[1].toString();

  return new Promise((res, reject) => {
    chrome.tabs.executeScript(null, {
      code: `window.__lighthouse = window.__lighthouse || {};
      window.__lighthouse['${fnPair[0]}'] = ${singleLineFn}`
    }, ret => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }

      res(ret);
    });
  });
}

function convertAuditToPromiseString(auditName, audit) {
  return `Promise.all([
      Promise.resolve("${auditName}"),
      Promise.resolve("${audit[1]}"),
      (${audit[0].toString()})()
  ])`;
}

function runAudits(chrome, audits) {
  const auditNames = Object.keys(audits);

  // Reduce each group of audits.
  const fnString = auditNames.reduce((prevAuditGroup, auditName, auditGroupIndex) => {
    // Then within each group, reduce each audit down to a Promise.
    return prevAuditGroup + (auditGroupIndex > 0 ? ',' : '') +
      audits[auditName].reduce((prevAudit, audit, auditIndex) => {
        return prevAudit + (auditIndex > 0 ? ',' : '') +
            convertAuditToPromiseString(auditName, audit);
      }, '');
  }, '');

  // Ask the tab to run the promises, and beacon back the results.
  chrome.tabs.executeScript(null, {
    code: `Promise.all([${fnString}]).then(__lighthouse.postAuditResults)`
  }, function() {
    if (chrome.runtime.lastError) {
      throw chrome.runtime.lastError;
    }
  });
}

function postAuditResults(results) {
  chrome.runtime.sendMessage({onAuditsComplete: results});
}

var functionsToInject = [
  ['ManifestParser', ManifestParser],
  ['parseManifest', parseManifest],
  ['postAuditResults', postAuditResults]
];

var audits = {
  Security: [
    [isOnHTTPS, 'Served over HTTPS']
  ],
  Offline: [
    [hasServiceWorkerRegistration, 'Has a service worker registration']
  ],
  Manifest: [
    [hasManifest, 'Exists'],
    [hasManifestThemeColor, 'Contains theme_color'],
    [hasManifestBackgroundColor, 'Contains background_color'],
    [hasManifestStartUrl, 'Contains start_url'],
    [hasManifestShortName, 'Contains short_name'],
    [hasManifestName, 'Contains name'],
    [hasManifestIcons, 'Contains icons defined'],
    [hasManifestIcons192, 'Contains 192px icon'],
  ],
  Miscellaneous: [
    [hasCanonicalUrl, 'Site has a Canonical URL']
  ]
};

function createResultsHTML(results) {
  const resultsGroup = {};
  let groupName = null;
  results.forEach(result => {
    groupName = result[0];
    if (!resultsGroup[groupName]) {
      resultsGroup[groupName] = [];
    }

    resultsGroup[groupName].push({
      title: result[1],
      value: result[2]
    });
  });

  const groups = Object.keys(resultsGroup);
  let resultsHTML = '';

  groups.forEach(group => {
    let groupHasErrors = false;

    const groupHTML = resultsGroup[group].reduce((prev, result) => {
      const status = result.value ?
          '<span class="pass">Pass</span>' : '<span class="fail">Fail</span>';
      groupHasErrors = groupHasErrors || (!result.value);
      return prev + `<li>${result.title}: ${status}</li>`;
    }, '');

    const groupClass = 'group ' +
        (groupHasErrors ? 'errors expanded' : 'no-errors collapsed');

    resultsHTML +=
      `<li class="${groupClass}">
        <span class="group-name">${group}</span>
        <ul>
          ${groupHTML}
        </ul>
      </li>`;
  });

  return resultsHTML;
}

export function runPwaAudits(chrome) {
  return new Promise((resolve, reject) => {
    chrome.runtime.onMessage.addListener(message => {
      if (!message.onAuditsComplete) {
        return;
      }
      resolve(createResultsHTML(message.onAuditsComplete));
    });

    Promise.all(functionsToInject.map(fnPair => injectIntoTab(chrome, fnPair)))
        .then(_ => runAudits(chrome, audits),
            err => {
              throw err;
            })
        .catch(err => {
          reject(err);
        });
  });
}
