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

const idb = require('idb-keyval');
const FirebaseAuth = require('./firebase-auth');
const logger = require('./logger');

// TODO: We only need getFilenamePrefix from asset-saver. Tree shake!
const getFilenamePrefix = require('../../../lighthouse-core/lib/asset-saver').getFilenamePrefix;

/**
 * Wrapper around the Github API for reading/writing gists.
 * @class
 */
class GithubAPI {
  constructor() {
    // this.CLIENT_ID = '48e4c3145c4978268ecb';
    this.auth = new FirebaseAuth();
    this._saving = false;
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
    if (this._saving) {
      return Promise.reject(new Error('Save already in progress'));
    }

    logger.log('Saving report to Github...', false);
    this._saving = true;

    return this.auth.getAccessToken()
      .then(accessToken => {
        const filename = getFilenamePrefix({
          url: jsonFile.url,
          generatedTime: jsonFile.generatedTime
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
        this._saving = false;
        return json.id;
      }).catch(err => {
        this._saving = false;
        throw err;
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

module.exports = GithubAPI;
