/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const PasswordInputsWithPreventedPasteGatherer =
  require('../../../../gather/gatherers/dobetterweb/password-inputs-with-prevented-paste');
const assert = require('assert');
let gatherer;

describe('PasswordInputsWithPreventedPaste gatherer', () => {
  beforeEach(() => {
    gatherer = new PasswordInputsWithPreventedPasteGatherer();
  });

  it('returns an artifact', () => {
    return gatherer
      .afterPass({
        driver: {
          evaluateAsync() {
            return Promise.resolve([
              {
                snippet: '<input type="password" onpaste="return false"/>'
              }
            ]);
          }
        }
      })
      .then(artifact => {
        assert.ok(typeof artifact === 'object');
        assert.ok(artifact[0].snippet.length > 0);
      });
  });
});
