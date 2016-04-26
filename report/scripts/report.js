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

/* global window, document */

'use strict';

/* Using ES5 to broaden support */
function Report() {
  // A Magic value for the menu top.
  var MENU_PADDING_TOP = 29;

  this.menu = document.querySelector('.js-menu');
  this.menuContainer = document.querySelector('.js-menu-container');
  this.printButton = document.querySelector('.js-print');
  this.menuBCR = this.menuContainer.getBoundingClientRect();
  this.menuTopPosition = this.menuBCR.top + window.scrollY - MENU_PADDING_TOP;
  this.onScroll = this.onScroll.bind(this);
  this.onResize = this.onResize.bind(this);

  this.addEventListeners();
  this.onResize();
}

Report.prototype = {
  onScroll: function() {
    this.handleMenuStickiness();
  },

  handleMenuStickiness(options) {
    var forceUpdate = (options && options.forceUpdate) || false;
    var menuIsSticky = this.menu.classList.contains('menu--fixed');
    var menuShouldBeSticky = (window.scrollY > this.menuTopPosition);

    // If no change early exit.
    if (!forceUpdate && menuShouldBeSticky === menuIsSticky) {
      return;
    }

    if (menuShouldBeSticky) {
      this.menu.classList.add('menu--fixed');
      this.menu.style.width = this.menuBCR.width + 'px';
      this.menu.style.left = this.menuBCR.left + 'px';
    } else {
      this.menu.classList.remove('menu--fixed');
    }
  },

  onResize: function() {
    this.menuBCR = this.menuContainer.getBoundingClientRect();
    this.handleMenuStickiness({forceUpdate: true});
  },

  onPrint: function() {
    window.print();
  },

  addEventListeners: function() {
    window.addEventListener('scroll', this.onScroll);
    window.addEventListener('resize', this.onResize);
    this.printButton.addEventListener('click', this.onPrint);
  }
};

(function() {
  return new Report();
})();
