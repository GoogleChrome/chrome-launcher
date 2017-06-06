/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const URL = require('./url-shim');
const validateColor = require('./web-inspector').Color.parse;

const ALLOWED_DISPLAY_VALUES = [
  'fullscreen',
  'standalone',
  'minimal-ui',
  'browser'
];
/**
 * All display-mode fallbacks, including when unset, lead to default display mode 'browser'.
 * @see https://w3c.github.io/manifest/#dfn-default-display-mode
 */
const DEFAULT_DISPLAY_MODE = 'browser';

const ALLOWED_ORIENTATION_VALUES = [
  'any',
  'natural',
  'landscape',
  'portrait',
  'portrait-primary',
  'portrait-secondary',
  'landscape-primary',
  'landscape-secondary'
];

function parseString(raw, trim) {
  let value;
  let debugString;

  if (typeof raw === 'string') {
    value = trim ? raw.trim() : raw;
  } else {
    if (raw !== undefined) {
      debugString = 'ERROR: expected a string.';
    }
    value = undefined;
  }

  return {
    raw,
    value,
    debugString
  };
}

function parseColor(raw) {
  const color = parseString(raw);

  // Finished if color missing or not a string.
  if (color.value === undefined) {
    return color;
  }

  // Use DevTools's color parser to check CSS3 Color parsing.
  const validatedColor = validateColor(color.raw);
  if (!validatedColor) {
    color.value = undefined;
    color.debugString = 'ERROR: color parsing failed.';
  }

  return color;
}

function parseName(jsonInput) {
  return parseString(jsonInput.name, true);
}

function parseShortName(jsonInput) {
  return parseString(jsonInput.short_name, true);
}

/**
 * Returns whether the urls are of the same origin. See https://html.spec.whatwg.org/#same-origin
 * @param {string} url1
 * @param {string} url2
 * @return {boolean}
 */
function checkSameOrigin(url1, url2) {
  const parsed1 = new URL(url1);
  const parsed2 = new URL(url2);

  return parsed1.origin === parsed2.origin;
}

/**
 * https://w3c.github.io/manifest/#start_url-member
 */
function parseStartUrl(jsonInput, manifestUrl, documentUrl) {
  const raw = jsonInput.start_url;

  // 8.10(3) - discard the empty string and non-strings.
  if (raw === '') {
    return {
      raw,
      value: documentUrl,
      debugString: 'ERROR: start_url string empty'
    };
  }
  const parsedAsString = parseString(raw);
  if (!parsedAsString.value) {
    parsedAsString.value = documentUrl;
    return parsedAsString;
  }

  // 8.10(4) - construct URL with raw as input and manifestUrl as the base.
  let startUrl;
  try {
    startUrl = new URL(raw, manifestUrl).href;
  } catch (e) {
    // 8.10(5) - discard invalid URLs.
    return {
      raw,
      value: documentUrl,
      debugString: 'ERROR: invalid start_url relative to ${manifestUrl}'
    };
  }

  // 8.10(6) - discard start_urls that are not same origin as documentUrl.
  if (!checkSameOrigin(startUrl, documentUrl)) {
    return {
      raw,
      value: documentUrl,
      debugString: 'ERROR: start_url must be same-origin as document'
    };
  }

  return {
    raw,
    value: startUrl
  };
}

function parseDisplay(jsonInput) {
  const display = parseString(jsonInput.display, true);

  if (!display.value) {
    display.value = DEFAULT_DISPLAY_MODE;
    return display;
  }

  display.value = display.value.toLowerCase();
  if (!ALLOWED_DISPLAY_VALUES.includes(display.value)) {
    display.debugString = 'ERROR: \'display\' has invalid value ' + display.value +
        ` will fall back to ${DEFAULT_DISPLAY_MODE}.`;
    display.value = DEFAULT_DISPLAY_MODE;
  }

  return display;
}

function parseOrientation(jsonInput) {
  const orientation = parseString(jsonInput.orientation, true);

  if (orientation.value &&
      !ALLOWED_ORIENTATION_VALUES.includes(orientation.value.toLowerCase())) {
    orientation.value = undefined;
    orientation.debugString = 'ERROR: \'orientation\' has an invalid value, will be ignored.';
  }

  return orientation;
}

function parseIcon(raw, manifestUrl) {
  // 9.4(3)
  const src = parseString(raw.src, true);
  // 9.4(4) - discard if trimmed value is the empty string.
  if (src.value === '') {
    src.value = undefined;
  }
  if (src.value) {
    // 9.4(4) - construct URL with manifest URL as the base
    src.value = new URL(src.value, manifestUrl).href;
  }

  const type = parseString(raw.type, true);

  const density = {
    raw: raw.density,
    value: 1,
    debugString: undefined
  };
  if (density.raw !== undefined) {
    density.value = parseFloat(density.raw);
    if (isNaN(density.value) || !isFinite(density.value) || density.value <= 0) {
      density.value = 1;
      density.debugString = 'ERROR: icon density cannot be NaN, +∞, or less than or equal to +0.';
    }
  }

  const sizes = parseString(raw.sizes);
  if (sizes.value !== undefined) {
    const set = new Set();
    sizes.value.trim().split(/\s+/).forEach(size => set.add(size.toLowerCase()));
    sizes.value = set.size > 0 ? Array.from(set) : undefined;
  }

  return {
    raw,
    value: {
      src,
      type,
      density,
      sizes
    },
    debugString: undefined
  };
}

function parseIcons(jsonInput, manifestUrl) {
  const raw = jsonInput.icons;

  if (raw === undefined) {
    return {
      raw,
      value: [],
      debugString: undefined
    };
  }

  if (!Array.isArray(raw)) {
    return {
      raw,
      value: [],
      debugString: 'ERROR: \'icons\' expected to be an array but is not.'
    };
  }

  // TODO(bckenny): spec says to skip icons missing `src`, so debug messages on
  // individual icons are lost. Warn instead?
  const value = raw
    // 9.6(3)(1)
    .filter(icon => icon.src !== undefined)
    // 9.6(3)(2)(1)
    .map(icon => parseIcon(icon, manifestUrl))
    // 9.6(3)(2)(2)
    .filter(parsedIcon => parsedIcon.value.src.value !== undefined);

  return {
    raw,
    value,
    debugString: undefined
  };
}

function parseApplication(raw) {
  const platform = parseString(raw.platform, true);
  const id = parseString(raw.id, true);

  // 10.2.(2) and 10.2.(3)
  const appUrl = parseString(raw.url, true);
  if (appUrl.value) {
    try {
      // 10.2.(4) - attempt to construct URL.
      appUrl.value = new URL(appUrl.value).href;
    } catch (e) {
      appUrl.value = undefined;
      appUrl.debugString = 'ERROR: invalid application URL ${raw.url}';
    }
  }

  return {
    raw,
    value: {
      platform,
      id,
      url: appUrl
    },
    debugString: undefined
  };
}

function parseRelatedApplications(jsonInput) {
  const raw = jsonInput.related_applications;

  if (raw === undefined) {
    return {
      raw,
      value: undefined,
      debugString: undefined
    };
  }

  if (!Array.isArray(raw)) {
    return {
      raw,
      value: undefined,
      debugString: 'ERROR: \'related_applications\' expected to be an array but is not.'
    };
  }

  // TODO(bckenny): spec says to skip apps missing `platform`, so debug messages
  // on individual apps are lost. Warn instead?
  const value = raw
    .filter(application => !!application.platform)
    .map(parseApplication)
    .filter(parsedApp => !!parsedApp.value.id.value || !!parsedApp.value.url.value);

  return {
    raw,
    value,
    debugString: undefined
  };
}

function parsePreferRelatedApplications(jsonInput) {
  const raw = jsonInput.prefer_related_applications;
  let value;
  let debugString;

  if (typeof raw === 'boolean') {
    value = raw;
  } else {
    if (raw !== undefined) {
      debugString = 'ERROR: \'prefer_related_applications\' expected to be a boolean.';
    }
    value = undefined;
  }

  return {
    raw,
    value,
    debugString
  };
}

function parseThemeColor(jsonInput) {
  return parseColor(jsonInput.theme_color);
}

function parseBackgroundColor(jsonInput) {
  return parseColor(jsonInput.background_color);
}

/**
 * Parse a manifest from the given inputs.
 * @param {string} string Manifest JSON string.
 * @param {string} manifestUrl URL of manifest file.
 * @param {string} documentUrl URL of document containing manifest link element.
 * @return {!ManifestNode<(!Manifest|undefined)>}
 */
function parse(string, manifestUrl, documentUrl) {
  if (manifestUrl === undefined || documentUrl === undefined) {
    throw new Error('Manifest and document URLs required for manifest parsing.');
  }

  let jsonInput;

  try {
    jsonInput = JSON.parse(string);
  } catch (e) {
    return {
      raw: string,
      value: undefined,
      debugString: 'ERROR: file isn\'t valid JSON: ' + e
    };
  }

  /* eslint-disable camelcase */
  const manifest = {
    name: parseName(jsonInput),
    short_name: parseShortName(jsonInput),
    start_url: parseStartUrl(jsonInput, manifestUrl, documentUrl),
    display: parseDisplay(jsonInput),
    orientation: parseOrientation(jsonInput),
    icons: parseIcons(jsonInput, manifestUrl),
    related_applications: parseRelatedApplications(jsonInput),
    prefer_related_applications: parsePreferRelatedApplications(jsonInput),
    theme_color: parseThemeColor(jsonInput),
    background_color: parseBackgroundColor(jsonInput)
  };
  /* eslint-enable camelcase */

  return {
    raw: string,
    value: manifest,
    debugString: undefined
  };
}

module.exports = parse;
