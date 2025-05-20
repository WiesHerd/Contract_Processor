import { saveAs } from 'file-saver';
import { z } from 'zod';

export const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be in format x.y.z"),
  type: z.enum(["Schedule A", "Schedule B", "Hybrid", "Hospitalist", "Leadership"]),
  content: z.string(),
});

export type Template = z.infer<typeof templateSchema> & {
  id: string;
  lastModified: string;
  placeholders: string[];
};

export function extractPlaceholders(content: string): string[] {
  const placeholderRegex = /{{([^}]+)}}/g;
  const matches = Array.from(content.matchAll(placeholderRegex));
  return matches
    .map(match => match[1])
    .filter((value, index, self) => self.indexOf(value) === index);
}

export function validateTemplate(template: Template): { isValid: boolean; errors: Record<string, string> } {
  try {
    templateSchema.parse(template);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach(err => {
        if (err.path) {
          errors[err.path[0]] = err.message;
        }
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: 'Invalid template' } };
  }
}

export function generateDocument(template: Template, data: Record<string, any>): string {
  let content = template.content;

  // Replace all placeholders with their values
  template.placeholders.forEach(placeholder => {
    const value = data[placeholder] ?? '';
    content = content.replace(
      new RegExp(`{{${placeholder}}}`, 'g'),
      String(value)
    );
  });

  return content;
}

export function downloadDocument(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, filename);
}

export function generateTestData(template: Template): Record<string, any> {
  const testData: Record<string, any> = {};

  template.placeholders.forEach(placeholder => {
    // Generate appropriate test data based on placeholder name
    if (placeholder.toLowerCase().includes('name')) {
      testData[placeholder] = 'John Doe';
    } else if (placeholder.toLowerCase().includes('date')) {
      testData[placeholder] = new Date().toISOString().split('T')[0];
    } else if (placeholder.toLowerCase().includes('salary') || placeholder.toLowerCase().includes('amount')) {
      testData[placeholder] = '100000';
    } else if (placeholder.toLowerCase().includes('fte')) {
      testData[placeholder] = '1.0';
    } else if (placeholder.toLowerCase().includes('rvu')) {
      testData[placeholder] = '5000';
    } else {
      testData[placeholder] = `[${placeholder}]`;
    }
  });

  return testData;
} 