/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

export as namespace LH

export interface Flags {
  _: string[];
  port: number;
  chromeFlags: string;
  output: any;
  outputPath: string;
  saveAssets: boolean;
  view: boolean;
  maxWaitForLoad: number;
  logLevel: string;
  hostname: string;
  blockedUrlPatterns: string[];
  enableErrorReporting: boolean;
  listAllAudits: boolean;
  listTraceCategories: boolean;
  auditMode: boolean;
  gatherMode: boolean;
  configPath?: string;
  perf: boolean;
  verbose: boolean;
  quiet: boolean;
}

export interface Config {

}

export interface AuditResult {
  rawValue: boolean|number;
  displayValue?: string;
  debugString?: string;
  score?: boolean|number;
  optimalValue: number|string;
  extendedInfo?: {value: string;};
}

export interface AuditResults {
  [metric: string]: AuditResult
}

export interface AuditFullResult {
  rawValue: boolean|number;
  displayValue: string;
  debugString?: string;
  score: boolean|number;
  scoringMode: string;
  error?: boolean;
  description: string;
  name: string;
  helpText?: string;
  extendedInfo?: {value: string};
}

export interface AuditFullResults {
  [metric: string]: AuditFullResult
}

export interface Results {
  url: string;
  audits: AuditFullResults;
  lighthouseVersion: string;
  artifacts?: Object;
  initialUrl: string;
  generatedTime: string;
}

export interface LaunchedChrome {
  pid: number;
  port: number;
  kill: () => Promise<{}>;
}

export interface LighthouseError extends Error {
  code?: string
}
