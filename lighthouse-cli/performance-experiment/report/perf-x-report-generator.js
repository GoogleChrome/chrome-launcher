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
 *
 */

'use strict';

const fs = require('fs');
const path = require('path');
const ReportGenerator = require('../../../lighthouse-core/report/report-generator');

class PerfXReportGenerator extends ReportGenerator {
  getReportJS(reportContext) {
    const scriptArr = super.getReportJS(reportContext);
    scriptArr.push(fs.readFileSync(path.join(__dirname, './injected-script.js'), 'utf8'));
    return scriptArr;
  }
}

module.exports = PerfXReportGenerator;
