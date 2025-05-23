export interface Provider {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  startDate: string;
  fte: number;
  baseSalary: number;
  wRVUTarget?: number;
  conversionFactor?: number;
  retentionBonus?: number;
  templateTag?: string;
  lastModified: string;
  [key: string]: string | number | undefined; // Allow dynamic fields from CSV
} 