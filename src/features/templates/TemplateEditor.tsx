import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, Save, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be in format x.y.z"),
  type: z.enum(["Schedule A", "Schedule B", "Hybrid", "Hospitalist", "Leadership"]),
  content: z.string(),
});

type Template = z.infer<typeof templateSchema> & {
  id: string;
  lastModified: string;
  placeholders: string[];
};

interface TemplateEditorProps {
  template: Template | null;
  onSave: (template: Template) => void;
  onClose: () => void;
}

export function TemplateEditor({ template, onSave, onClose }: TemplateEditorProps) {
  const [editedTemplate, setEditedTemplate] = useState<Template | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newPlaceholder, setNewPlaceholder] = useState('');

  useEffect(() => {
    if (template) {
      setEditedTemplate(template);
    }
  }, [template]);

  if (!editedTemplate) return null;

  const handleContentChange = (content: string) => {
    setEditedTemplate(prev => {
      if (!prev) return null;
      
      // Extract placeholders from content
      const placeholderRegex = /{{([^}]+)}}/g;
      const placeholders = Array.from(content.matchAll(placeholderRegex))
        .map(match => match[1])
        .filter((value, index, self) => self.indexOf(value) === index);

      return {
        ...prev,
        content,
        placeholders
      };
    });
  };

  const handleAddPlaceholder = () => {
    if (!newPlaceholder) return;

    setEditedTemplate(prev => {
      if (!prev) return null;

      const placeholder = newPlaceholder.trim();
      if (prev.placeholders.includes(placeholder)) {
        setErrors(prev => ({
          ...prev,
          placeholder: 'This placeholder already exists'
        }));
        return prev;
      }

      setNewPlaceholder('');
      setErrors(prev => ({ ...prev, placeholder: '' }));

      return {
        ...prev,
        placeholders: [...prev.placeholders, placeholder],
        content: prev.content + `{{${placeholder}}}`
      };
    });
  };

  const handleRemovePlaceholder = (placeholder: string) => {
    setEditedTemplate(prev => {
      if (!prev) return null;

      // Remove placeholder from content
      const content = prev.content.replace(new RegExp(`{{${placeholder}}}`, 'g'), '');

      return {
        ...prev,
        content,
        placeholders: prev.placeholders.filter(p => p !== placeholder)
      };
    });
  };

  const handleSave = () => {
    try {
      // Validate template
      templateSchema.parse(editedTemplate);
      
      // Update last modified
      const updatedTemplate = {
        ...editedTemplate,
        lastModified: new Date().toISOString().split('T')[0]
      };

      onSave(updatedTemplate);
      onClose();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

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
                onValueChange={(value: Template['type']) => setEditedTemplate(prev => prev ? { ...prev, type: value } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Schedule A">Schedule A</SelectItem>
                  <SelectItem value="Schedule B">Schedule B</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                  <SelectItem value="Hospitalist">Hospitalist</SelectItem>
                  <SelectItem value="Leadership">Leadership</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Placeholders</Label>
              <div className="flex gap-2">
                <Input
                  value={newPlaceholder}
                  onChange={e => setNewPlaceholder(e.target.value)}
                  placeholder="Add placeholder..."
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleAddPlaceholder}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.placeholder && (
                <p className="text-sm text-red-500">{errors.placeholder}</p>
              )}

              <ScrollArea className="h-[200px] rounded-md border p-2">
                <div className="space-y-2">
                  {editedTemplate.placeholders.map(placeholder => (
                    <div
                      key={placeholder}
                      className="flex items-center justify-between bg-gray-50 p-2 rounded"
                    >
                      <span className="text-sm font-mono">{`{{${placeholder}}}`}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePlaceholder(placeholder)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Right side - Content editor */}
          <div className="col-span-2 space-y-4">
            <Label>Content</Label>
            <ScrollArea className="h-[500px] rounded-md border">
              <textarea
                className="w-full h-full p-4 font-mono text-sm"
                value={editedTemplate.content}
                onChange={e => handleContentChange(e.target.value)}
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