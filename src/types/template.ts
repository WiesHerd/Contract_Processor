export type TemplateType = 'Base' | 'Productivity' | 'Hybrid' | 'Hospital-based' | (string & {});

export interface Template {
  id: string;
  name: string;
  description: string;
  version: string;
  type: TemplateType;
  lastModified: string;
  placeholders: string[];
  docxTemplate: string | File | null;
  clauseIds: string[];
  content: string;
} 