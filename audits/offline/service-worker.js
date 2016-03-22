/**
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

'use strict';

class ServiceWorker {

  static get tags() {
    return ['Offline'];
  }

  static get description() {
    return 'Has a Service Worker registration';
  }

  static audit(inputs) {
    const registrations = inputs.serviceWorkers.versions;
    const activatedRegistrations = registrations.filter(reg =>
        reg.status === 'activated');

    return {
      value: (activatedRegistrations.length > 0),
      tags: ServiceWorker.tags,
      description: ServiceWorker.description
    };
  }
}

module.exports = ServiceWorker;
