import { z } from 'zod';
import { CompensationModel } from './provider';

export const ClauseSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'notEquals', 'greaterThan', 'lessThan', 'exists']),
    value: z.any(),
  })).optional(),
});

export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),
  compensationModel: CompensationModel,
  tags: z.array(z.string()),
  clauses: z.array(ClauseSchema),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    createdBy: z.string(),
    lastModifiedBy: z.string(),
  }),
  docxTemplate: z.string().optional(),
  htmlPreviewContent: z.string().optional(),
  editedHtmlContent: z.string().optional(),
  contractYear: z.string().optional(),
  placeholders: z.array(z.string()),
  clauseIds: z.array(z.string()),
  content: z.string().optional(),
  versionHistory: z.array(z.object({
    timestamp: z.string(),
    html: z.string(),
  })).optional(),
});

export type Clause = z.infer<typeof ClauseSchema>;
export type Template = z.infer<typeof TemplateSchema>;

export interface TemplateState {
  templates: Template[];
  selectedTemplate: string | null;
  loading: boolean;
  error: string | null;
}

export interface TemplateUpload {
  file: File;
  metadata: Omit<Template, 'id' | 'metadata'>;
}

export type TemplateType = CompensationModel;

export interface TemplateMapping {
  id: string;
  templateId: string;
  metadata: {
    updatedAt: string;
    createdAt: string;
    createdBy: string;
    lastModifiedBy: string;
  };
  mappings: Array<{
    placeholder: string;
    mappedColumn?: string;
    notes?: string;
  }>;
} 