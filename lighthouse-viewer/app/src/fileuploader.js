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

const logger = require('./logger');

/**
 * Manages drag and drop file input for the page.
 * @class
 */
class FileUploader {
  /**
   * @param {function()} fileHandlerCallback Invoked when the user chooses a new file.
   */
  constructor(fileHandlerCallback) {
    this.dropZone = document.querySelector('.drop_zone');
    this.placeholder = document.querySelector('.viewer-placeholder');
    this._fileHandlerCallback = fileHandlerCallback;
    this._dragging = false;

    this.addHiddenFileInput();
    this.addListeners();
  }

  addHiddenFileInput() {
    this.fileInput = document.createElement('input');
    this.fileInput.id = 'hidden-file-input';
    this.fileInput.type = 'file';
    this.fileInput.hidden = true;
    this.fileInput.accept = 'application/json';

    this.fileInput.addEventListener('change', e => {
      this._fileHandlerCallback(e.target.files[0]);
    });

    document.body.appendChild(this.fileInput);
  }

  addListeners() {
    this.placeholder.firstElementChild.addEventListener('click', e => {
      if (e.target.localName !== 'input') {
        this.fileInput.click();
      }
    });

    // The mouseleave event is more reliable than dragleave when the user drops
    // the file outside the window.
    document.addEventListener('mouseleave', _ => {
      if (!this._dragging) {
        return;
      }
      this._resetDraggingUI();
    });

    document.addEventListener('dragover', e => {
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy'; // Explicitly show as copy action.
    });

    document.addEventListener('dragenter', _ => {
      this.dropZone.classList.add('dropping');
      this._dragging = true;
    });

    document.addEventListener('drop', e => {
      e.stopPropagation();
      e.preventDefault();

      this._resetDraggingUI();

      // Note, this ignores multiple files in the drop, only taking the first.
      this._fileHandlerCallback(e.dataTransfer.files[0]);
    });
  }

  _resetDraggingUI() {
    this.dropZone.classList.remove('dropping');
    this._dragging = false;
    logger.hide();
  }

  removeDropzonePlaceholder() {
    // Remove placeholder drop area after viewing results for first time.
    // General dropzone takes over.
    if (this.placeholder) {
      this.placeholder.remove();
      this.placeholder = null;
    }
  }

  /**
   * Reads a file and returns its content in the specified format.
   * @static
   * @param {!File} file
   * @return {!Promise<string>}
   */
  static readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new window.FileReader();
      reader.onload = function(e) {
        resolve(e.target.result);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

module.exports = FileUploader;
