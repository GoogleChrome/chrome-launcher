/**
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

var ManifestParser = (function() {

  var _jsonInput = {};
  var _manifest = {};
  var _logs = [];
  var _tips = [];
  var _success = true;

  var ALLOWED_DISPLAY_VALUES = ['fullscreen',
                                 'standalone',
                                 'minimal-ui',
                                 'browser'];

  var ALLOWED_ORIENTATION_VALUES = ['any',
                                     'natural',
                                     'landscape',
                                     'portrait',
                                     'portrait-primary',
                                     'portrait-secondary',
                                     'landscape-primary',
                                     'landscape-secondary'];

  function _parseString(args) {
    var object = args.object;
    var property = args.property;
    if (!(property in object)) {
      return undefined;
    }

    if (typeof object[property] != 'string') {
      _logs.push('ERROR: \'' + property +
          '\' expected to be a string but is not.');
      return undefined;
    }

    if (args.trim) {
      return object[property].trim();
    }
    return object[property];
  }

  function _parseBoolean(args) {
    var object = args.object;
    var property = args.property;
    var defaultValue = args.defaultValue;
    if (!(property in object)) {
      return defaultValue;
    }

    if (typeof object[property] != 'boolean') {
      _logs.push('ERROR: \'' + property +
          '\' expected to be a boolean but is not.');
      return defaultValue;
    }

    return object[property];
  }

  function _parseURL(args) {
    var object = args.object;
    var property = args.property;
    var baseURL = args.baseURL;

    var str = _parseString({object: object, property: property, trim: false});
    if (str === undefined) {
      return undefined;
    }

    // TODO: resolve url using baseURL
    // new URL(object[property], baseURL);
    return object[property];
  }

  function _parseColor(args) {
    var object = args.object;
    var property = args.property;
    if (!(property in object)) {
      return undefined;
    }

    if (typeof object[property] != 'string') {
      _logs.push('ERROR: \'' + property +
          '\' expected to be a string but is not.');
      return undefined;
    }

    // If style.color changes when set to the given color, it is valid. Testing
    // against 'white' and 'black' in case of the given color is one of them.
    var dummy = document.createElement('div');
    dummy.style.color = 'white';
    dummy.style.color = object[property];
    if (dummy.style.color != 'white') {
      return object[property];
    }
    dummy.style.color = 'black';
    dummy.style.color = object[property];
    if (dummy.style.color != 'black') {
      return object[property];
    }
    return undefined;
  }

  function _parseName() {
    return _parseString({object: _jsonInput, property: 'name', trim: true});
  }

  function _parseShortName() {
    return _parseString({object: _jsonInput,
                          property: 'short_name',
                          trim: true});
  }

  function _parseStartUrl() {
    // TODO: parse url using manifest_url as a base (missing).
    return _parseURL({object: _jsonInput, property: 'start_url'});
  }

  function _parseDisplay() {
    var display = _parseString({object: _jsonInput,
                                 property: 'display',
                                 trim: true});
    if (display === undefined) {
      return display;
    }

    if (ALLOWED_DISPLAY_VALUES.indexOf(display.toLowerCase()) == -1) {
      _logs.push('ERROR: \'display\' has an invalid value, will be ignored.');
      return undefined;
    }

    return display;
  }

  function _parseOrientation() {
    var orientation = _parseString({object: _jsonInput,
                                     property: 'orientation',
                                     trim: true});
    if (orientation === undefined) {
      return orientation;
    }

    if (ALLOWED_ORIENTATION_VALUES.indexOf(orientation.toLowerCase()) == -1) {
      _logs.push('ERROR: \'orientation\' has an invalid value' +
          ', will be ignored.');
      return undefined;
    }

    return orientation;
  }

  function _parseIcons() {
    var property = 'icons';
    var icons = [];

    if (!(property in _jsonInput)) {
      return icons;
    }

    if (!Array.isArray(_jsonInput[property])) {
      _logs.push('ERROR: \'' + property +
          '\' expected to be an array but is not.');
      return icons;
    }

    _jsonInput[property].forEach(function(object) {
      var icon = {};
      if (!('src' in object)) {
        return;
      }
      // TODO: pass manifest url as base.
      icon.src = _parseURL({object: object, property: 'src'});
      icon.type = _parseString({object: object,
                                 property: 'type',
                                 trim: true});

      icon.density = parseFloat(object.density);
      if (isNaN(icon.density) || !isFinite(icon.density) || icon.density <= 0) {
        icon.density = 1.0;
      }

      if ('sizes' in object) {
        var set = new Set();
        var link = document.createElement('link');
        link.sizes = object.sizes;

        for (var i = 0; i < link.sizes.length; ++i) {
          set.add(link.sizes.item(i).toLowerCase());
        }

        if (set.size != 0) {
          icon.sizes = set;
        }
      }

      icons.push(icon);
    });

    return icons;
  }

  function _parseRelatedApplications() {
    var property = 'related_applications';
    var applications = [];

    if (!(property in _jsonInput)) {
      return applications;
    }

    if (!Array.isArray(_jsonInput[property])) {
      _logs.push('ERROR: \'' + property +
          '\' expected to be an array but is not.');
      return applications;
    }

    _jsonInput[property].forEach(function(object) {
      var application = {};
      application.platform = _parseString({object: object,
                                            property: 'platform',
                                            trim: true});
      application.id = _parseString({object: object,
                                      property: 'id',
                                      trim: true});
      // TODO: pass manfiest url as base.
      application.url = _parseURL({object: object, property: 'url'});
      applications.push(application);
    });

    return applications;
  }

  function _parsePreferRelatedApplications() {
    return _parseBoolean({object: _jsonInput,
                           property: 'prefer_related_applications',
                           defaultValue: false});
  }

  function _parseThemeColor() {
    return _parseColor({object: _jsonInput, property: 'theme_color'});
  }

  function _parseBackgroundColor() {
    return _parseColor({object: _jsonInput, property: 'background_color'});
  }

  function _parse(string) {
    // TODO: temporary while ManifestParser is a collection of static methods.
    _logs = [];
    _tips = [];
    _success = true;

    try {
      _jsonInput = JSON.parse(string);
    } catch (e) {
      _logs.push('File isn\'t valid JSON: ' + e);
      _tips.push('Your JSON failed to parse, these are the main reasons why ' +
        'JSON parsing usually fails:\n' +
        '- Double quotes should be used around property names and for ' +
        'strings. Single quotes are not valid.\n' +
        '- JSON specification disallow trailing comma after the last ' +
        'property even if some implementations allow it.');

      _success = false;
      return;
    }

    _logs.push('JSON parsed successfully.');

    _manifest.name = _parseName();
    /* eslint-disable camelcase */
    _manifest.short_name = _parseShortName();
    _manifest.start_url = _parseStartUrl();
    _manifest.display = _parseDisplay();
    _manifest.orientation = _parseOrientation();
    _manifest.icons = _parseIcons();
    _manifest.related_applications = _parseRelatedApplications();
    _manifest.prefer_related_applications = _parsePreferRelatedApplications();
    _manifest.theme_color = _parseThemeColor();
    _manifest.background_color = _parseBackgroundColor();

    _logs.push('Parsed `name` property is: ' +
        _manifest.name);
    _logs.push('Parsed `short_name` property is: ' +
        _manifest.short_name);
    _logs.push('Parsed `start_url` property is: ' +
        _manifest.start_url);
    _logs.push('Parsed `display` property is: ' +
        _manifest.display);
    _logs.push('Parsed `orientation` property is: ' +
        _manifest.orientation);
    _logs.push('Parsed `icons` property is: ' +
        JSON.stringify(_manifest.icons, null, 4));
    _logs.push('Parsed `related_applications` property is: ' +
        JSON.stringify(_manifest.related_applications, null, 4));
    _logs.push('Parsed `prefer_related_applications` property is: ' +
        JSON.stringify(_manifest.prefer_related_applications, null, 4));
    _logs.push('Parsed `theme_color` property is: ' +
        _manifest.theme_color);
    _logs.push('Parsed `background_color` property is: ' +
        _manifest.background_color);
    /* eslint-enable camelcase */
  }

  return {
    parse: _parse,
    manifest: function() { return _manifest; },
    logs: function() { return _logs; },
    tips: function() { return _tips; },
    success: function() { return _success; }
  };
})();

module.exports = ManifestParser;
