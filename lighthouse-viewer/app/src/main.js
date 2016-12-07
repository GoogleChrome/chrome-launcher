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

const ReportGenerator = require('../../../lighthouse-core/report/report-generator');
// TODO: We only need getFilenamePrefix from asset-saver. Tree shake!
const getFilenamePrefix = require('../../../lighthouse-core/lib/asset-saver.js').getFilenamePrefix;

const firebase = require('firebase/app');
require('firebase/auth');
const idb = require('idb-keyval');

// Polyfills
// TODO: dynamically load this based on feature detection.
require('whatwg-fetch');
const URLSearchParams = require('url-search-params');

const LH_CURRENT_VERSION = require('../../../package.json').version;
const APP_URL = `${location.origin}${location.pathname}`;

/**
 * Logs messages via a UI butter.
 * @class
 */
class Logger {
  constructor(selector) {
    this.el = document.querySelector(selector);
  }

  /**
   * Shows a butter bar.
   * @param {!string} msg The message to show.
   * @param {boolean=} autoHide True to hide the message after a duration.
   *     Default is true.
   */
  log(msg, autoHide = true) {
    clearTimeout(this._id);

    this.el.textContent = msg;
    this.el.classList.add('show');
    if (autoHide) {
      this._id = setTimeout(_ => {
        this.el.classList.remove('show');
      }, 7000);
    }
  }

  warn(msg) {
    this.log('Warning: ' + msg);
    console.warn(msg);
  }

  error(msg) {
    this.log(msg);
    console.error(msg);
  }

  /**
   * Explicitly hides the butter bar.
   */
  hide() {
    clearTimeout(this._id);
    this.el.classList.remove('show');
  }
}

const logger = new Logger('#log');

/**
 * Wrapper for Firebase Authentication
 * @class
 */
class FirebaseAuth {
  constructor() {
    this.accessToken = null;
    this.user = null;

    this.provider = new firebase.auth.GithubAuthProvider();
    this.provider.addScope('gist');

    firebase.initializeApp({
      apiKey: 'AIzaSyApMz8FHTyJNqqUtA51tik5Mro8j-2qMcM',
      authDomain: 'lighthouse-viewer.firebaseapp.com',
      databaseURL: 'https://lighthouse-viewer.firebaseio.com',
      storageBucket: 'lighthouse-viewer.appspot.com',
      messagingSenderId: '962507201498'
    });

    // Wrap auth state callback in a promise so other parts of the app that
    // require login can hook into the changes.
    this.ready = new Promise((resolve, reject) => {
      firebase.auth().onAuthStateChanged(user => {
        idb.get('accessToken').then(token => {
          if (user && token) {
            this.accessToken = token;
            this.user = user;
          }
          resolve(user);
        });
      });
    });
  }

  /**
   * Signs in the user to Github using the Firebase API.
   * @return {!Promise<string>} The logged in user.
   */
  signIn() {
    return firebase.auth().signInWithPopup(this.provider).then(result => {
      this.accessToken = result.credential.accessToken;
      this.user = result.user;
      // A limitation of firebase auth is that it doesn't return an oauth token
      // after a page refresh. We'll get a firebase token, but not an oauth token
      // for GH. Since GH's tokens never expire, stash the access token in IDB.
      return idb.set('accessToken', this.accessToken).then(_ => {
        return this.accessToken;
      });
    });
  }

  getAccessToken() {
    return this.accessToken ? Promise.resolve(this.accessToken) : this.signIn();
  }

  /**
   * Signs the user out.
   * @return {!Promise}
   */
  signOut() {
    return firebase.auth().signOut().then(_ => {
      this.accessToken = null;
      return idb.delete('accessToken');
    });
  }
}

/**
 * Wrapper around the Github API for reading/writing gists.
 * @class
 */
class GithubAPI {
  constructor() {
    // this.CLIENT_ID = '48e4c3145c4978268ecb';
    this.auth = new FirebaseAuth();
  }

  static get LH_JSON_EXT() {
    return '.lighthouse.report.json';
  }

  /**
   * Creates a gist under the users account.
   * @param{{url: string, generatedTime: string}} jsonFile The gist file body.
   * @return {!Promise<string>} id of the created gist.
   */
  createGist(jsonFile) {
    logger.log('Saving report to Github...', false);

    return this.auth.getAccessToken()
      .then(accessToken => {
        const filename = getFilenamePrefix({
          url: jsonFile.url,
          date: new Date(jsonFile.generatedTime)
        });
        const body = {
          description: 'Lighthouse json report',
          public: false,
          files: {
            [`${filename}${GithubAPI.LH_JSON_EXT}`]: {
              content: JSON.stringify(jsonFile)
            }
          }
        };

        const request = new Request('https://api.github.com/gists', {
          method: 'POST',
          headers: new Headers({Authorization: `token ${accessToken}`}),
          // Stringify twice so quotes are escaped for POST request to succeed.
          body: JSON.stringify(body)
        });
        return fetch(request);
      })
      .then(resp => resp.json())
      .then(json => {
        logger.log('Saved!');
        return json.id;
      });
  }

  /**
   * Fetches the body content of a gist.
   * @param {!string} id The id of a gist.
   * @return {!Promise<{etag: string, content: !Object}>} parsed json content of the gist.
   */
  getGistFileContentAsJson(id) {
    return this.auth.ready.then(user => {
      const headers = new Headers();

      // If there's an authenticated user, include an Authorization header to
      // have higher rate limits with the Github API. Otherwise, rely on ETags.
      if (user) {
        headers.set('Authorization', `token ${this.auth.accessToken}`);
      }

      return idb.get(id).then(cachedGist => {
        if (cachedGist && cachedGist.etag) {
          headers.set('If-None-Match', cachedGist.etag);
        }

        // Always make the request to see if there's newer content.
        return fetch(`https://api.github.com/gists/${id}`, {headers}).then(resp => {
          const remaining = resp.headers.get('X-RateLimit-Remaining');
          const limit = resp.headers.get('X-RateLimit-Limit');
          if (Number(remaining) < 10) {
            logger.warn('Approaching Github\'s rate limit. ' +
                        `${limit - remaining}/${limit} requests used. Consider signing ` +
                        'in to increase this limit.');
          }

          const etag = resp.headers.get('ETag');

          if (!resp.ok) {
            if (resp.status === 304) {
              return cachedGist;
            } else if (resp.status === 404) {
              // Delete the entry from IDB if it no longer exists on the server.
              idb.delete(id); // Note: async.
            }
            throw new Error(`${resp.status} fetching gist`);
          }

          return resp.json().then(json => {
            const fileName = Object.keys(json.files)[0]; // Attempt to use first file in gist.
            const f = json.files[fileName];
            if (f.truncated) {
              return fetch(f.raw_url).then(resp => resp.json())
                  .then(json => ({etag, content: json}));
            }
            return {etag, content: JSON.parse(f.content)};
          });
        });
      });
    });
  }

  /**
   * Fetches the user's gists.
   * @param {!string} username
   * @return {!Promise<Array>} List of user's gists.
   */
  getGists(username) {
    return fetch(`https://api.github.com/users/${username}/gists`, {
      headers: new Headers({
        Authorization: `token ${this.auth.accessToken}`
      })
    })
    .then(resp => resp.json());
  }
}

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
    this.placeholder.firstElementChild.addEventListener('click', _ => {
      this.fileInput.click();
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

/**
 * Class to handle dynamic changes to the page when users view new reports.
 * @class
 */
class LighthouseViewerReport {
  constructor() {
    this.onShare = this.onShare.bind(this);
    this.onFileUpload = this.onFileUpload.bind(this);

    this.json = null;
    this.fileUploader = new FileUploader(this.onFileUpload);
    this.github = new GithubAPI();

    this.addListeners();
    this.loadFromURL();
  }

  addListeners() {
    const printButton = document.querySelector('.js-print');
    if (!printButton) {
      return;
    }

    printButton.addEventListener('click', _ => {
      window.print();
    });

    const button = document.createElement('button');
    button.classList.add('share');
    button.addEventListener('click', this.onShare);
    printButton.parentElement.insertBefore(button, printButton);
  }

  loadFromURL() {
    // Pull gist id from URL and render it.
    const params = new URLSearchParams(location.search);
    const gistId = params.get('gist');
    if (gistId) {
      logger.log('Fetching report from Github...', false);

      this.github.auth.ready.then(_ => {
        this.github.getGistFileContentAsJson(gistId).then(json => {
          logger.hide();
          this.replaceReportHTML(json.content);

          // Save fetched json and etag to IDB so we can use it later for 304
          // requests. This is done after replaceReportHTML, so we don't save
          // unrecognized JSON to IDB. replaceReportHTML will throw in that case.
          return idb.set(gistId, {etag: json.etag, content: json.content});
        }).catch(err => logger.error(err.message));
      });
    }
  }

  _validateReportJson(reportJson) {
    if (!reportJson.lighthouseVersion) {
      throw new Error('JSON file was not generated by Lighthouse');
    }

    // Leave off patch version in the comparison.
    const semverRe = new RegExp(/^(\d+)?\.(\d+)?\.(\d+)$/);
    const reportVersion = reportJson.lighthouseVersion.replace(semverRe, '$1.$2');
    const lhVersion = LH_CURRENT_VERSION.replace(semverRe, '$1.$2');

    if (reportVersion < lhVersion) {
      // TODO: figure out how to handler older reports. All permalinks to older
      // reports will start to throw this warning when the viewer rev's its
      // minor LH version.
      // See https://github.com/GoogleChrome/lighthouse/issues/1108
      // eslint-disable-next-line
      logger.warn('Results may not display properly.\n' +
                  'Report was created with an earlier version of ' +
                  `Lighthouse (${reportJson.lighthouseVersion}). The latest ` +
                  `version is ${LH_CURRENT_VERSION}.`);
    }
  }

  replaceReportHTML(json) {
    this._validateReportJson(json);

    const reportGenerator = new ReportGenerator();

    let html;
    try {
      html = reportGenerator.generateHTML(json, 'viewer');
    } catch (err) {
      html = reportGenerator.renderException(err, json);
    }

    // Use only the results section of the full HTML page.
    const div = document.createElement('div');
    div.innerHTML = html;
    html = div.querySelector('.js-report').outerHTML;

    this.json = json;

    // Remove the placeholder drop area UI once the user has interacted.
    this.fileUploader.removeDropzonePlaceholder();

    // Replace the HTML and hook up event listeners to the new DOM.
    document.querySelector('output').innerHTML = html;
    this.addListeners();
  }

  /**
   * Updates the page's HTML with contents of the JSON file passed in.
   * @param {!File} file
   * @return {!Promise<string>}
   * @throws file was not valid JSON generated by Lighthouse or an unknown file
   *     type of used.
   */
  onFileUpload(file) {
    return FileUploader.readFile(file).then(str => {
      if (!file.type.match('json')) {
        throw new Error('Unsupported report format. Expected JSON.');
      }
      this.replaceReportHTML(JSON.parse(str));
    }).catch(err => logger.error(err.message));
  }

  /**
   * Shares the current report by creating a gist on Github.
   * @return {!Promise<string>} id of the created gist.
   */
  onShare() {
    // TODO: find and reuse existing json gist if one exists.
    return this.github.createGist(this.json).then(id => {
      history.pushState({}, null, `${APP_URL}?gist=${id}`);
      return id;
    }).catch(err => logger.log(err.message));
  }
}

(function() {
  // eslint-disable-next-line no-unused-vars
  const report = new LighthouseViewerReport();
})();
