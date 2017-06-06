/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/*eslint-disable*/

(function() {

const params = new URLSearchParams(location.search);

if (location.search === '' || params.has('dateNow')) {
  // FAIL - Date.now() usage in another file.
  const d = Date.now();
}

if (location.search === '' || params.has('mutationEvents')) {
  // FAIL - MutationEvent usage in another file.
  document.addEventListener('DOMNodeInserted', function(e) {
    console.log('DOMNodeInserted');
  });
}

if (location.search === '' || params.has('passiveEvents')) {
  // FAIL - non-passive listener usage in another file.
  document.addEventListener('wheel', e => {
    console.log('wheel: arrow function');
  });
}

if (location.search === '' || params.has('deprecations')) {
  const div = document.createElement('div');
  div.createShadowRoot();
  div.createShadowRoot(); // FAIL - multiple shadow v0 roots.
}

})();
