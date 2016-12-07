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

const firebase = require('firebase/app');
require('firebase/auth');
const idb = require('idb-keyval');

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

  getAccessToken() {
    return this.accessToken ? Promise.resolve(this.accessToken) : this.signIn();
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

module.exports = FirebaseAuth;
