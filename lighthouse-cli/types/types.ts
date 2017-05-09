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

interface AggregationResultItem {
  overall: number;
  name: string;
  scored: boolean;
  subItems: Array<AuditFullResult|string>;
}

interface Aggregation {
  name: string;
  score: Array<AggregationResultItem>;
  total: number;
}

interface Results {
  url: string;
  aggregations: Array<Aggregation>;
  audits: AuditFullResults;
  lighthouseVersion: string;
  artifacts?: Object;
  initialUrl: string;
  generatedTime: string;
}

export {
  Results,
  Aggregation,
  AggregationResultItem,
  AuditResult,
  AuditResults,
  AuditFullResult,
  AuditFullResults,
}
