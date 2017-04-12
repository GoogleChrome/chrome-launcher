/**
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

class DetailsRenderer {
  /**
   * @param {!DOM} dom
   */
  constructor(dom) {
    this._dom = dom;
  }

  /**
   * @param {!DetailsJSON} details
   * @return {!Element}
   */
  render(details) {
    switch (details.type) {
      case 'text':
        return this._renderText(details);
      case 'block':
        return this._renderBlock(details);
      case 'list':
        return this._renderList(details);
      default:
        throw new Error(`Unknown type: ${details.type}`);
    }
  }

  /**
   * @param {!DetailsJSON} text
   * @return {!Element}
   */
  _renderText(text) {
    const element = this._dom.createElement('div', 'lighthouse-text');
    element.textContent = text.text;
    return element;
  }

  /**
   * @param {!DetailsJSON} block
   * @return {!Element}
   */
  _renderBlock(block) {
    const element = this._dom.createElement('div', 'lighthouse-block');
    for (const item of block.items) {
      element.appendChild(this.render(item));
    }
    return element;
  }

  /**
   * @param {!DetailsJSON} list
   * @return {!Element}
   */
  _renderList(list) {
    const element = this._dom.createElement('details', 'lighthouse-list');
    if (list.header) {
      const summary = this._dom.createElement('summary', 'lighthouse-list__header');
      summary.textContent = list.header.text;
      element.appendChild(summary);
    }

    const items = this._dom.createElement('div', 'lighthouse-list__items');
    for (const item of list.items) {
      items.appendChild(this.render(item));
    }
    element.appendChild(items);
    return element;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DetailsRenderer;
}

/** @typedef {{type: string, text: string|undefined, header: DetailsJSON|undefined, items: Array<DetailsJSON>|undefined}} */
DetailsRenderer.DetailsJSON; // eslint-disable-line no-unused-expressions
