interface AuditResult {
  rawValue: boolean|number;
  displayValue?: string;
  debugString?: string;
  score?: boolean|number;
  optimalValue: number|string;
  extendedInfo?: {
    value: string;
    formatter: string;
  };
}

interface AuditFullResult {
  rawValue: boolean|number;
  displayValue: string;
  debugString?: string;
  score: boolean|number;
  error?: boolean;
  description: string;
  name: string;
  category: string;
  helpText?: string;
  extendedInfo?: {
    value: string;
    formatter: string;
  };
}

interface AggregationResultItem {
  overall: number;
  name: string;
  scored: boolean;
  subItems: Array<AuditFullResult | string>;
}

interface Aggregation {
  name: string;
  score: Array<AggregationResultItem>;
  total: number;
}

interface Results {
  url: string;
  aggregations: Array<Aggregation>;
  audits: Object;
  lighthouseVersion: string;
  artifacts?: Object;
}

export {
  Results,
  Aggregation,
  AggregationResultItem,
  AuditResult,
  AuditFullResult,
}
