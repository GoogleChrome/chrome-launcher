/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const readline = require('readline');

function ask(question: string, options: string[]): Promise<string> {
  return new Promise(resolve => {
    const iface = readline.createInterface(process.stdin, process.stdout);
    const optionsStr = options.map((o, i) => i + 1 + '. ' + o).join('\r\n');

    iface.setPrompt(question + '\r\n' + optionsStr + '\r\nChoice: ');
    iface.prompt();

    iface.on('line', (_answer: string) => {
      const answer = toInt(_answer);
      if (answer > 0 && answer <= options.length) {
        iface.close();
        resolve(options[answer - 1]);
      } else {
        iface.prompt();
      }
    });
  });
}

function toInt(n: string): number {
  const result = parseInt(n, 10);
  return isNaN(result) ? 0 : result;
}

export {ask};
