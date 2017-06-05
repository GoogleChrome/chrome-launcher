interface AuditResult {
  rawValue: boolean|number;
  displayValue?: string;
  debugString?: string;
  score?: boolean|number;
  optimalValue: number|string;
  extendedInfo?: {value: string; formatter: string;};
}

interface AuditResults {
  [metric: string]: AuditResult
}

interface AuditFullResult {
  rawValue: boolean|number;
  displayValue: string;
  debugString?: string;
  score: boolean|number;
  scoringMode: string;
  error?: boolean;
  description: string;
  name: string;
  category: string;
  helpText?: string;
  extendedInfo?: {value: string; formatter: string;};
}

interface AuditFullResults {
  [metric: string]: AuditFullResult
}

interface Results {
  url: string;
  audits: AuditFullResults;
  lighthouseVersion: string;
  artifacts?: Object;
  initialUrl: string;
  generatedTime: string;
}

export {
  Results,
  AuditResult,
  AuditResults,
  AuditFullResult,
  AuditFullResults,
}
