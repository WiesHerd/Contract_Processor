export interface Clause {
  id: string;
  title: string;
  content: string;
  type: 'standard' | 'custom';
  category: 'compensation' | 'benefits' | 'termination' | 'restrictive' | 'other';
  tags: string[];
  applicableProviderTypes: ('physician' | 'advanced-practitioner' | 'other')[];
  applicableCompensationModels: ('base' | 'productivity' | 'hybrid' | 'hospitalist' | 'leadership')[];
  conditions?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'exists' | 'notExists';
    value?: any;
  }[];
  createdAt: string;
  updatedAt: string;
  version: string;
  metadata?: Record<string, any>;
} 