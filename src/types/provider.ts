export interface Provider {
  id: string;
  name: string;
  credentials?: string;
  specialty?: string;
  startDate: string;
  endDate?: string;
  fte: number;
  baseSalary?: number;
  wRVUTarget?: number;
  conversionFactor?: number;
  retentionBonus?: number | { amount: number; vestingPeriod: number; conditions: string[] };
  templateTag?: string;
  type: 'physician' | 'advanced-practitioner' | 'other';
  lastModified?: string;
  signingBonus?: number;
  relocationBonus?: number;
  qualityBonus?: number;
  cmeAmount?: number;
  originalAgreementDate?: string;
  [key: string]: any;
} 