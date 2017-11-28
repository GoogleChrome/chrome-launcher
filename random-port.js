/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
/**
 * Return a random, unused port.
 */
function getRandomPort() {
    return new Promise((resolve, reject) => {
        const server = http_1.createServer();
        server.listen(0);
        server.once('listening', () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.once('error', reject);
    });
}
exports.getRandomPort = getRandomPort;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZG9tLXBvcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyYW5kb20tcG9ydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztHQUlHO0FBQ0gsWUFBWSxDQUFDOztBQUViLCtCQUFrQztBQUVsQzs7R0FFRztBQUNIO0lBQ0UsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU07UUFDakMsTUFBTSxNQUFNLEdBQUcsbUJBQVksRUFBRSxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakIsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDdkIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQztZQUNuQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMvQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFWRCxzQ0FVQyJ9