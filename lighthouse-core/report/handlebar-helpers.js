/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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
'use strict';

/* global Intl */

const Handlebars = require('handlebars');
const marked = require('marked');

const RATINGS = {
  GOOD: {label: 'good', minScore: 75},
  AVERAGE: {label: 'average', minScore: 45},
  POOR: {label: 'poor'}
};

function calculateRating(value) {
  let rating = RATINGS.POOR.label;
  if (value >= RATINGS.GOOD.minScore) {
    rating = RATINGS.GOOD.label;
  } else if (value >= RATINGS.AVERAGE.minScore) {
    rating = RATINGS.AVERAGE.label;
  }
  return rating;
}

const getTotalScore = function(aggregation) {
  return Math.round(aggregation.total * 100);
};

const getItemRating = function(value) {
  if (typeof value === 'boolean') {
    return value ? RATINGS.GOOD.label : RATINGS.POOR.label;
  }
  return calculateRating(value);
};

const handlebarHelpers = {
  // Converts a name to a link.
  nameToLink: name => {
    return name.toLowerCase().replace(/\s/g, '-');
  },

  // Figures out the total score for an aggregation
  getTotalScore,

  // Converts the total score to a rating that can be used for styling.
  getTotalScoreRating: aggregation => {
    const totalScore = getTotalScore(aggregation);
    return calculateRating(totalScore);
  },

  // Converts an aggregation's score to a rating that can be used for styling.
  getAggregationScoreRating: score => {
    return calculateRating(Math.round(score * 100));
  },

  // Converts a value to a rating string, which can be used inside the report
  // for color styling.
  getItemRating,

  // Figures out the icon to display when success or info
  getScoreGoodIcon: informative => informative ? 'info' : 'good',

  // Figures out the icon to display when fail or warn
  getScoreBadIcon: (informative, additional) =>
    (informative || additional) ? 'warning score-warning-bg':'poor score-poor-bg',

  shouldShowHelpText: value => (getItemRating(value) !== RATINGS.GOOD.label),

  // Convert numbers to fixed point decimals
  decimal: number => {
    if (number && number.toFixed) {
      return number.toFixed(2);
    }
    return number;
  },

  // value is boolean?
  isBool: value => (typeof value === 'boolean'),

  // !value
  not: value => !value,

  // value === value2?
  ifEq: function(lhs, rhs, options) {
    if (lhs === rhs) {
      // eslint-disable-next-line no-invalid-this
      return options.fn(this);
    } else {
      // eslint-disable-next-line no-invalid-this
      return options.inverse(this);
    }
  },

  // value !== value2
  ifNotEq: function(lhs, rhs, options) {
    if (lhs !== rhs) {
      // eslint-disable-next-line no-invalid-this
      return options.fn(this);
    } else {
      // eslint-disable-next-line no-invalid-this
      return options.inverse(this);
    }
  },

  // arg1 && arg2 && ... && argn
  and: (...args) => {
    let arg = false;
    for (let i = 0, n = args.length - 1; i < n; i++) {
      arg = args[i];
      if (!arg) {
        break;
      }
    }
    return arg;
  },

  // myFavoriteVar -> my-favorite-var
  kebabCase: str => {
    return (str || '')
      // break up camelCase tokens
      .split(/([A-Z]+[a-z0-9]*)/)
      // replace all special characters and whitespace with hyphens
      .map(part => part.toLowerCase().replace(/[^a-z0-9]+/gi, '-'))
      // rejoin into a single string
      .join('-')
      // de-dupe hyphens
      .replace(/-+/g, '-')
      // remove leading or trailing hyphens
      .replace(/(^-|-$)/g, '');
  },

  // eslint-disable-next-line no-unused-vars
  sanitize: (str, opts) => {
    // const isViewer = opts.data.root.reportContext === 'viewer';

    // Allow the report to inject HTML, but sanitize it first.
    // Viewer in particular, allows user's to upload JSON. To mitigate against
    // XSS, define a renderer that only transforms a few types of markdown blocks.
    // All other markdown and HTML is ignored.
    const renderer = new marked.Renderer();
    renderer.em = str => `<em>${str}</em>`;
    renderer.link = (href, title, text) => {
      const titleAttr = title ? `title="${title}"` : '';
      return `<a href="${href}" target="_blank" rel="noopener" ${titleAttr}>${text}</a>`;
    };
    renderer.codespan = function(str) {
      return `<code>${str}</code>`;
    };
    // eslint-disable-next-line no-unused-vars
    renderer.code = function(code, language) {
      return `<pre>${Handlebars.Utils.escapeExpression(code)}</pre>`;
    };
    renderer.image = function(src, title, text) {
      return `<img src="${src}" alt="${text}" title="${title}">`;
    };

    // Nuke wrapper <p> tag that gets generated.
    renderer.paragraph = function(str) {
      return str;
    };

    try {
      str = marked(str, {renderer, sanitize: true});
    } catch (e) {
      // Ignore fatal errors from marked js.
    }

    // The input str has been sanitized and transformed. Mark it as safe so
    // handlebars renders the text as HTML.
    return new Handlebars.SafeString(str);
  },

  // format time
  formatDateTime: date => {
    const options = {
      day: 'numeric', month: 'numeric', year: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      timeZoneName: 'short'
    };
    let formatter = new Intl.DateTimeFormat('en-US', options);

    // Force UTC if runtime timezone could not be detected.
    // See https://github.com/GoogleChrome/lighthouse/issues/1056
    const tz = formatter.resolvedOptions().timeZone;
    if (!tz || tz.toLowerCase() === 'etc/unknown') {
      options.timeZone = 'UTC';
      formatter = new Intl.DateTimeFormat('en-US', options);
    }
    return formatter.format(new Date(date));
  }

};

module.exports = handlebarHelpers;
