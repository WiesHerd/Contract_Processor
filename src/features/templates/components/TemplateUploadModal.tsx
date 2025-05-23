import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { z } from 'zod';
import { TemplateType } from '@/types/template';

const templateTypes: TemplateType[] = ['Base', 'Productivity', 'Hybrid', 'Hospital-based'];

const uploadSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().min(1, 'Description is required'),
  version: z.string().min(1, 'Version is required'),
  type: z.string().min(1, 'Type is required'), // allow any non-empty string
});

export type UploadFormData = z.infer<typeof uploadSchema>;

interface TemplateUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  placeholders: string[];
  onSubmit: (data: UploadFormData) => void;
}

export function TemplateUploadModal({ isOpen, onClose, file, placeholders, onSubmit }: TemplateUploadModalProps) {
  if (!isOpen || !file) return null;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      name: file.name.replace(/\.docx$/, ''),
      description: '',
      version: '1.0.0',
      type: templateTypes[0],
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Template Metadata</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">DOCX File</label>
            <Input value={file.name} readOnly disabled />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Template Name</label>
            <Input {...register('name')} placeholder="Enter template name" />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              {...register('description')}
              className="w-full p-2 border rounded-md min-h-[60px]"
              placeholder="Describe this template (e.g., Base Pay, Base Plus Production, Hospital Service)"
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Version</label>
            <Input {...register('version')} placeholder="e.g., 1.0.0" />
            {errors.version && <p className="text-red-500 text-sm mt-1">{errors.version.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <Input
              {...register('type')}
              list="template-type-list"
              placeholder="e.g., Base, Productivity, Custom..."
              autoComplete="off"
            />
            <datalist id="template-type-list">
              {templateTypes.map(type => (
                <option key={type} value={type} />
              ))}
            </datalist>
            {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Extracted Placeholders</label>
            <div className="flex flex-wrap gap-2">
              {placeholders.length === 0 ? <span className="text-gray-400">None found</span> :
                placeholders.map(ph => (
                  <span key={ph} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">{ph}</span>
                ))}
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Template</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 