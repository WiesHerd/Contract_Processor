import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, Save, AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { Template, TemplateType } from '@/types/template';

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be in format x.y.z"),
  type: z.enum(['Base', 'Productivity', 'Hybrid', 'Hospital-based'] as const),
  content: z.string(),
  docxTemplate: z.string(),
  clauseIds: z.array(z.string()),
});

interface TemplateEditorProps {
  template: Template | null;
  onSave: (template: Template) => void;
  onClose: () => void;
}

export function TemplateEditor({ template, onSave, onClose }: TemplateEditorProps) {
  const [editedTemplate, setEditedTemplate] = useState<Template | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (template) {
      setEditedTemplate(template);
    }
  }, [template]);

  const handleSave = () => {
    if (!editedTemplate) return;

    try {
      templateSchema.parse(editedTemplate);
      onSave(editedTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path) {
            errors[err.path[0]] = err.message;
          }
        });
        setErrors(errors);
      }
    }
  };

  if (!editedTemplate) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 h-full">
          {/* Left sidebar - Template metadata */}
          <div className="col-span-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={editedTemplate.name}
                onChange={e => setEditedTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={editedTemplate.version}
                onChange={e => setEditedTemplate(prev => prev ? { ...prev, version: e.target.value } : null)}
              />
              {errors.version && (
                <p className="text-sm text-red-500">{errors.version}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={editedTemplate.type}
                onValueChange={(value: TemplateType) => setEditedTemplate(prev => prev ? { ...prev, type: value } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Base">Base</SelectItem>
                  <SelectItem value="Productivity">Productivity</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                  <SelectItem value="Hospital-based">Hospital-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right side - Content editor */}
          <div className="col-span-2 space-y-4">
            <Label>Content</Label>
            <ScrollArea className="h-[500px] rounded-md border">
              <textarea
                className="w-full h-full p-4 font-mono text-sm"
                value={editedTemplate.content}
                onChange={e => {
                  const content = e.target.value;
                  const placeholders = Array.from(content.matchAll(/{{([^}]+)}}/g))
                    .map(match => match[1])
                    .filter((value, index, self) => self.indexOf(value) === index);
                  setEditedTemplate(prev => prev ? { ...prev, content, placeholders } : null);
                }}
                placeholder="Enter template content..."
              />
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 