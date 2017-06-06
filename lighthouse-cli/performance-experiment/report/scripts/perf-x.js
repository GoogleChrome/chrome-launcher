/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/* eslint-env browser */

'use strict';

/**
 * @fileoverview Report script for Project Performance Experiment.
 *
 * Include functions for supporting interaction between report page and Perf-X server.
 */

class ConfigPanel {
  constructor() {
    this._configPanel = document.querySelector('.js-config-panel');
    this._messageField = this._configPanel.querySelector('.js-message');
    this._urlBlockingList = this._configPanel.querySelector('.js-url-blocking-patterns');
    this._urlBlockingStatus = {};

    // Compat: URL.searchParams isn't yet supported by Safari
    const match = location.search.match(/[?&]id=([^&]*)/);
    this._reportId = match ? match[1]: '';

    const bodyToggle = this._configPanel.querySelector('.js-panel-toggle');
    bodyToggle.addEventListener('click', () => this._toggleBody());

    const rerunButton = this._configPanel.querySelector('.js-rerun-button');
    rerunButton.addEventListener('click', () => this._rerunLighthouse());

    // init tabs
    const tabs = this._configPanel.querySelector('.js-tabs');
    const tabNodes = tabs.querySelectorAll('.js-tab');
    [...tabNodes].forEach(tab => {
      tab.addEventListener('click', () => {
        [...tabs.querySelectorAll('.is-active')].forEach(activeEle => {
          activeEle.classList.remove('is-active');
        });
        const tabPanelSelector = tab.getAttribute('href');
        tabs.querySelector(tabPanelSelector).classList.add('is-active');
        tab.classList.add('is-active');
      });
    });

    // init list view buttons
    const addButton = this._urlBlockingList.querySelector('.js-add-button');
    const patternInput = this._urlBlockingList.querySelector('.js-pattern-input');
    addButton.addEventListener('click', () => {
      if (patternInput.value) {
        this.addBlockedUrlPattern(patternInput.value);
        this._urlBlockingList.parentNode.scrollTop = this._urlBlockingList.offsetHeight;
        patternInput.value = '';
      }
    });
    patternInput.addEventListener('keypress', event => {
      if (event.keyCode === 13) {
        addButton.click();
      }
    });

    // init tree view buttons
    const requestBlockToggles = this._configPanel.querySelectorAll('.js-request-blocking-toggle');
    [...requestBlockToggles].forEach(toggle => {
      const requestNode = toggle.parentNode;
      const url = requestNode.getAttribute('title');

      toggle.addEventListener('click', () => {
        if (requestNode.classList.contains('request__block')) {
          this.removeBlockedUrlPattern(url);
        } else {
          this.addBlockedUrlPattern(url);
        }
      });
    });
  }

  /**
   * Send POST request to rerun lighthouse with additional flags.
   * @return {!Promise} resolve when rerun is completed.
   */
  _rerunLighthouse() {
    this.log('Start Rerunning Lighthouse');
    const options = {
      blockedUrlPatterns: this.getBlockedUrlPatterns()
    };

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/rerun?id=${this._reportId}`, true);
    xhr.onload = () => {
      if (xhr.status === 200) {
        location.assign(`?id=${xhr.responseText}`);
      } else if (xhr.status === 500) {
        this.log('Error: Lighthouse runtime error');
      }
    };
    xhr.send(JSON.stringify(options));
  }

  /**
   * Add blocked URL pattern if it's not in the blocking list.
   * URL blocking patterns in #config-panel__tabs__list-panel and #config-panel__tabs__tree-panel
   * will be updated accordingly.
   * @param {string} urlPattern
   */
  addBlockedUrlPattern(urlPattern) {
    urlPattern = urlPattern.trim();
    if (urlPattern.length === 0) {
      this.log('Error: URL blocking pattern is an empty string');
      return;
    } else if (this._urlBlockingStatus[urlPattern]) {
      this.log(`Error: ${urlPattern} is already in the list`);
      return;
    }

    const template = this._configPanel.querySelector('template.url-blocking-entry');
    const templateCopy = document.importNode(template.content, true);
    const newEntry = templateCopy.querySelector('.url-blocking-entry');

    // create and add a new entry in the list view
    newEntry.querySelector('div').textContent = urlPattern;
    newEntry.setAttribute('data-url-pattern', urlPattern);
    this._urlBlockingList.insertBefore(newEntry, template);
    newEntry.querySelector('button').addEventListener('click', () => {
      this.removeBlockedUrlPattern(urlPattern);
    });

    // update block status in cnc-tree if the url matches perfectly
    const treeNode = this._configPanel.querySelector(`.js-cnc-node[title='${urlPattern}']`);
    treeNode && treeNode.classList.add('request__block');

    this._urlBlockingStatus[urlPattern] = true;
    this.log(`Added URL Blocking Pattern: ${urlPattern}`);
  }

  /**
   * Remove blocked URL pattern if it's in the blocking list.
   * URL blocking patterns in #config-panel__tabs__list-panel and #config-panel__tabs__tree-panel
   * will be updated accordingly.
   * @param {string} urlPattern
   */
  removeBlockedUrlPattern(urlPattern) {
    urlPattern = urlPattern.trim();
    if (!this._urlBlockingStatus[urlPattern]) {
      this.log(`Error: ${urlPattern} is not in the list`);
      return;
    }

    // remove the entry in list view
    const entrySelector = `.url-blocking-entry[data-url-pattern='${urlPattern}']`;
    const urlEntry = this._configPanel.querySelector(entrySelector);
    urlEntry && urlEntry.parentNode.removeChild(urlEntry);

    // update block status in cnc-tree if the url matches perfectly
    const treeNodeSelector = `.js-cnc-node[title='${urlPattern}']`;
    const treeNode = this._configPanel.querySelector(treeNodeSelector);
    treeNode && treeNode.classList.remove('request__block');

    this._urlBlockingStatus[urlPattern] = false;
    this.log(`Removed URL Blocking Pattern: ${urlPattern}`);
  }

  /**
   * Get blocked URL patterns in the next run
   * @return {!Array<string>} an array of blocked URL patterns
   */
  getBlockedUrlPatterns() {
    return Object.keys(this._urlBlockingStatus).filter(key => this._urlBlockingStatus[key]);
  }

  /**
   * Show message in the config panel message field. Old message will be overwritten.
   */
  log(message) {
    this._messageField.innerHTML = message;
  }

  /**
   * Expand / fold config panel body.
   */
  _toggleBody() {
    this._configPanel.classList.toggle('expanded');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const configPanel = new ConfigPanel();

  // init recover blocked URL patterns
  [...document.querySelectorAll('.js-currently-blocked-url')].forEach(ele => {
    configPanel.addBlockedUrlPattern(ele.getAttribute('data-url-pattern'));
  });
  configPanel.log('');
});
