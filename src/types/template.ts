export type TemplateType = 'Base' | 'Productivity' | 'Hybrid' | 'Hospital-based';

export interface Template {
  id: string;
  name: string;
  version: string;
  type: TemplateType;
  lastModified: string;
  placeholders: string[];
  docxTemplate: string;
  clauseIds: string[];
} 