/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const validateColor = require('./web-inspector').Color.parse;

const ALLOWED_DISPLAY_VALUES = [
  'fullscreen',
  'standalone',
  'minimal-ui',
  'browser'
];

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

function parseURL(raw) {
  // TODO: resolve url using baseURL
  // var baseURL = args.baseURL;
  // new URL(parseString(raw).value, baseURL);
  return parseString(raw, true);
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

function parseStartUrl(jsonInput) {
  // TODO: parse url using manifest_url as a base (missing).
  // start_url must be same-origin as Document of the top-level browsing context.
  return parseURL(jsonInput.start_url);
}

function parseDisplay(jsonInput) {
  let display = parseString(jsonInput.display, true);

  if (display.value && ALLOWED_DISPLAY_VALUES.indexOf(display.value.toLowerCase()) === -1) {
    display.value = undefined;
    display.debugString = 'ERROR: \'display\' has an invalid value, will be ignored.';
  }

  return display;
}

function parseOrientation(jsonInput) {
  let orientation = parseString(jsonInput.orientation, true);

  if (orientation.value &&
      ALLOWED_ORIENTATION_VALUES.indexOf(orientation.value.toLowerCase()) === -1) {
    orientation.value = undefined;
    orientation.debugString = 'ERROR: \'orientation\' has an invalid value, will be ignored.';
  }

  return orientation;
}

function parseIcon(raw) {
  // TODO: pass manifest url as base.
  let src = parseURL(raw.src);
  let type = parseString(raw.type, true);

  let density = {
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

  let sizes = parseString(raw.sizes);
  if (sizes.value !== undefined) {
    let set = new Set();
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

function parseIcons(jsonInput) {
  const raw = jsonInput.icons;
  let value;

  if (raw === undefined) {
    return {
      raw,
      value,
      debugString: undefined
    };
  }

  if (!Array.isArray(raw)) {
    return {
      raw,
      value,
      debugString: 'ERROR: \'icons\' expected to be an array but is not.'
    };
  }

  // TODO(bckenny): spec says to skip icons missing `src`. Warn instead?
  value = raw.filter(icon => !!icon.src).map(parseIcon);

  return {
    raw,
    value,
    debugString: undefined
  };
}

function parseApplication(raw) {
  let platform = parseString(raw.platform, true);
  let id = parseString(raw.id, true);
  // TODO: pass manfiest url as base.
  let url = parseURL(raw.url);

  return {
    raw,
    value: {
      platform,
      id,
      url
    },
    debugString: undefined
  };
}

function parseRelatedApplications(jsonInput) {
  const raw = jsonInput.related_applications;
  let value;

  if (raw === undefined) {
    return {
      raw,
      value,
      debugString: undefined
    };
  }

  if (!Array.isArray(raw)) {
    return {
      raw,
      value,
      debugString: 'ERROR: \'related_applications\' expected to be an array but is not.'
    };
  }

  // TODO(bckenny): spec says to skip apps missing `platform`. Warn instead?
  value = raw.filter(application => !!application.platform).map(parseApplication);

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

function parse(string) {
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
  let manifest = {
    name: parseName(jsonInput),
    short_name: parseShortName(jsonInput),
    start_url: parseStartUrl(jsonInput),
    display: parseDisplay(jsonInput),
    orientation: parseOrientation(jsonInput),
    icons: parseIcons(jsonInput),
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
