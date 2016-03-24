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
'use strict';

const Audit = require('../audit');

class Viewport extends Audit {

  static get tags() {
    return ['Mobile Friendly'];
  }

  static get name() {
    return 'viewport';
  }

  static get description() {
    return 'Site has a viewport meta tag';
  }

  static audit(inputs) {
    // TODO: This'll be a false positive if the body content has this string.
    // Unless we want to parse the original HTML, we should query for `head > .meta[name=viewport]`
    const viewportExpression = /<meta ([^c]+)content="width=/gim;

    return Viewport.generateAuditResult(viewportExpression.test(inputs.html));
  }
}

module.exports = Viewport;
