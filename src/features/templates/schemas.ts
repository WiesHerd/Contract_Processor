import { z } from 'zod';
import { TemplateType } from '@/types/template';

export const newTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  version: z.string().min(1, 'Version is required'),
  compensationModel: z.enum(['BASE', 'PRODUCTIVITY', 'HYBRID', 'HOSPITALIST', 'LEADERSHIP'], {
    required_error: 'Compensation model is required',
  }),
  placeholders: z.array(z.string()).min(1, 'At least one placeholder is required'),
  clauseIds: z.array(z.string()),
  docxTemplate: z.string().min(1, 'Template file is required'),
});

export type NewTemplateFormData = z.infer<typeof newTemplateSchema>; 