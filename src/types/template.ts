export type TemplateType = 'base' | 'productivity' | 'hybrid' | 'hospitalist' | 'leadership' | 'Base' | 'Productivity' | 'Hybrid' | 'Hospital-based';

export interface Template {
  id: string;
  name: string;
  description?: string;
  type: TemplateType;
  docxTemplate?: string | File;
  htmlPreviewContent?: string;
  editedHtmlContent?: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  tags?: string[];
  metadata?: Record<string, any>;
  contractYear?: string;
  lastModified?: string;
  placeholders: string[];
  clauseIds: string[];
  content?: string;
  versionHistory?: Array<{ timestamp: string; html: string }>;
} 