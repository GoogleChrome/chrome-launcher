/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global Intl */

const Handlebars = require('handlebars/runtime');
const marked = require('marked');
const URL = require('../lib/url-shim');

const RATINGS = {
  GOOD: {label: 'good', minScore: 75},
  AVERAGE: {label: 'average', minScore: 45},
  POOR: {label: 'poor'}
};

/**
 * Convert a score to a rating label.
 * @param {number} value
 * @return {string}
 */
function calculateRating(value) {
  let rating = RATINGS.POOR.label;
  if (value >= RATINGS.GOOD.minScore) {
    rating = RATINGS.GOOD.label;
  } else if (value >= RATINGS.AVERAGE.minScore) {
    rating = RATINGS.AVERAGE.label;
  }
  return rating;
}

/**
 * Format number.
 * @param {number} number
 * @return {string}
 */
function formatNumber(number) {
  return number.toLocaleString(undefined, {maximumFractionDigits: 1});
}

/**
 * Converts a value to a rating string, which can be used inside the report for
 * color styling.
 * @param {(boolean|number)} value
 * @return {string}
 */
const getItemRating = function(value) {
  if (typeof value === 'boolean') {
    return value ? RATINGS.GOOD.label : RATINGS.POOR.label;
  }
  return calculateRating(value);
};

/**
 * Figures out the total score for an aggregation
 * @param {{total: number}} aggregation
 * @return {number}
 */
const getTotalScore = function(aggregation) {
  return Math.round(aggregation.total * 100);
};

const handlebarHelpers = {
  /**
   * arg1 && arg2 && ... && argn
   * @param {...*} args
   * @return {*}
   */
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

  /**
   * @param {number} startTime
   * @param {number} endTime
   * @return {string}
   */
  chainDuration(startTime, endTime) {
    return formatNumber((endTime - startTime) * 1000);
  },

  /**
   * Helper function for Handlebars that creates the context for each
   * critical-request-chain node based on its parent. Calculates if this node is
   * the last child, whether it has any children itself and what the tree looks
   * like all the way back up to the root, so the tree markers can be drawn
   * correctly.
   */
  createContextFor(parent, id, treeMarkers, parentIsLastChild, startTime, transferSize, opts) {
    const node = parent[id];
    const siblings = Object.keys(parent);
    const isLastChild = siblings.indexOf(id) === (siblings.length - 1);
    const hasChildren = Object.keys(node.children).length > 0;

    // Copy the tree markers so that we don't change by reference.
    const newTreeMarkers = Array.isArray(treeMarkers) ? treeMarkers.slice(0) : [];

    // Add on the new entry.
    if (typeof parentIsLastChild !== 'undefined') {
      newTreeMarkers.push(!parentIsLastChild);
    }

    return opts.fn({
      node,
      isLastChild,
      hasChildren,
      startTime,
      transferSize: (transferSize + node.request.transferSize),
      treeMarkers: newTreeMarkers
    });
  },

  /**
   * Preps a formatted table (headings/col vals) for output.
   * @param {!Object<string>} headings for the table. The order of this
   *     object's key/value pairs determines the order of the HTML table headings.
   *     There is special handling for certain keys:
   *       preview {url: string, mimeType: string}: For image mimetypes, wraps
   *           the value in a markdown image.
   *       code: wraps the value in single ` for a markdown code snippet.
   *       pre: wraps the value in triple ``` for a markdown code block.
   *       lineCol: combines the values for the line and col keys into a single
   *                value "line/col".
   *       isEval: returns "yes" if the script was eval'd.
   *       All other values are passed through as is.
   * @param {!Array<!Object>} results Audit results.
   * @param {{fn: function(*): string}} opts
   * @return {{headings: !Array<string>, rows: !Array<{cols: !Array<*>}>}}
   */
  createTable(headings, results, opts) {
    const headingKeys = Object.keys(headings);

    const rows = results.map(result => {
      const cols = headingKeys.map(key => {
        let value = result[key];
        if (typeof value === 'undefined') {
          value = '--';
        }

        switch (key) {
          case 'preview':
            if (/^image/.test(value.mimeType)) {
              // Markdown can't handle URLs with parentheses which aren't automatically encoded
              const encodedUrl = value.url.replace(/\)/g, '%29');
              return `[![Image preview](${encodedUrl} "Image preview")](${encodedUrl})`;
            }
            return '';
          case 'code':
            return '`' + value.trim() + '`';
          case 'pre':
            return '\`\`\`\n' + result[key].trim() + '\`\`\`';
          case 'lineCol':
            return `${result.line}:${result.col}`;
          case 'isEval':
            return value ? 'yes' : '';
          default:
            return String(value);
        }
      });

      return {cols};
    });

    headings = headingKeys.map(key => headings[key]);

    const table = {headings, rows, headingKeys};

    return opts.fn(table);
  },

  /**
   * Create render context for critical-request-chain tree display.
   * @param {!Object} tree
   * @param {!Object} opts
   * @return {string}
   */
  createTreeRenderContext(tree, opts) {
    const transferSize = 0;
    let startTime = 0;
    const rootNodes = Object.keys(tree);

    if (rootNodes.length > 0) {
      startTime = tree[rootNodes[0]].request.startTime;
    }

    return opts.fn({
      tree,
      startTime,
      transferSize
    });
  },

  /**
   * Convert numbers to fixed point decimals strings.
   * @param {*} maybeNumber
   * @return {*}
   */
  decimal: maybeNumber => {
    if (maybeNumber && maybeNumber.toFixed) {
      return maybeNumber.toFixed(2);
    }
    return maybeNumber;
  },

  /**
   * Format time.
   * @param {string} date
   * @return {string}
   */
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
  },

  formatNumber,

  /**
   * Format transfer size.
   * @param {number} number
   * @return {string}
   */
  formatTransferSize: size => {
    return (size / 1024).toLocaleString(undefined, {maximumFractionDigits: 2});
  },

  /**
   * Converts an aggregation's score to a rating that can be used for styling.
   * @param {number} score
   * @return {string}
   */
  getAggregationScoreRating: score => {
    return calculateRating(Math.round(score * 100));
  },

  getItemRating,

  /**
   * Figures out the icon to display when fail or warn.
   * @param {boolean} informative
   * @param {boolean} additional
   * @return {string}
   */
  getScoreBadIcon: (informative, additional) =>
    (informative || additional) ? 'warning score-warning-bg':'poor score-poor-bg',

  /**
   * Figures out the icon to display when success or info.
   * @param {boolean} informative
   * @return {string}
   */
  getScoreGoodIcon: informative => informative ? 'info' : 'good',

  getTotalScore,

  /**
   * Converts the total score to a rating that can be used for styling.
   * @param {{total: number}} aggregation
   * @return {string}
   */
  getTotalScoreRating: aggregation => {
    const totalScore = getTotalScore(aggregation);
    return calculateRating(totalScore);
  },

  /**
   * a > b
   * @param {number} a
   * @param {number} b
   * @return {boolean}
   */
  gt: (a, b) => a > b,

  /**
   * lhs === rhs
   * @param {*} lhs
   * @param {*} rhs
   * @param {!Object} options
   * @return {string}
   */
  ifEq: function(lhs, rhs, options) {
    if (lhs === rhs) {
      // eslint-disable-next-line no-invalid-this
      return options.fn(this);
    } else {
      // eslint-disable-next-line no-invalid-this
      return options.inverse(this);
    }
  },

  /**
   * lhs !== rhs
   * @param {*} lhs
   * @param {*} rhs
   * @param {!Object} options
   * @return {string}
   */
  ifNotEq: function(lhs, rhs, options) {
    if (lhs !== rhs) {
      // eslint-disable-next-line no-invalid-this
      return options.fn(this);
    } else {
      // eslint-disable-next-line no-invalid-this
      return options.inverse(this);
    }
  },

  /**
   * @param {*} value
   * @return {boolean}
   */
  isBool: value => (typeof value === 'boolean'),

  /**
   * myFavoriteVar -> my-favorite-var
   * @param {string} str
   * @return {string}
   */
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

  /**
   * Converts a name to a link.
   * @param {string} name
   * @return {string}
   */
  nameToLink: name => {
    return name.toLowerCase().replace(/\s/g, '-');
  },

  /**
   * Coerces value to boolean, returns the negation.
   * @param {*} value
   * @return {boolean}
   */
  not: value => !value,

  /**
   * Split the URL into a file and hostname for easy display.
   * @param {string} resourceURL
   * @param {!Object} opts
   * @return {string}
   */
  parseURL: (resourceURL, opts) => {
    const parsedURL = {
      file: URL.getURLDisplayName(resourceURL),
      hostname: new URL(resourceURL).hostname
    };

    return opts.fn(parsedURL);
  },

  /**
   * Allow the report to inject HTML, but sanitize it first.
   * Viewer in particular, allows user's to upload JSON. To mitigate against
   * XSS, define a renderer that only transforms a few types of markdown blocks.
   * All other markdown and HTML is ignored.
   * @param {string} str
   * @return {string}
   */
  sanitize: (str) => {
    // const isViewer = opts.data.root.reportContext === 'viewer';

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

  /**
   * @param {(boolean|number)} value
   * @return {boolean}
   */
  shouldShowHelpText: value => (getItemRating(value) !== RATINGS.GOOD.label)
};

module.exports = handlebarHelpers;
