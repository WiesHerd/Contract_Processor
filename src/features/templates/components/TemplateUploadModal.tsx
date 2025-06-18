import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { z } from 'zod';
import { TemplateType } from '@/types/template';

const templateTypes: TemplateType[] = ['BASE', 'PRODUCTIVITY', 'HYBRID', 'HOSPITALIST'];

const uploadSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().min(1, 'Description is required'),
  version: z.string().min(1, 'Version is required'),
  type: z.string().min(1, 'Type is required'), // allow any non-empty string
  contractYear: z.string().min(4, 'Contract year is required'),
});

export type UploadFormData = z.infer<typeof uploadSchema>;

interface TemplateUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  placeholders: string[];
  onSubmit: (data: UploadFormData) => void;
  initialData?: Partial<UploadFormData>;
  mode?: 'upload' | 'edit';
}

export function TemplateUploadModal({ isOpen, onClose, file, placeholders, onSubmit, initialData, mode = 'upload' }: TemplateUploadModalProps) {
  if (!isOpen || (mode === 'upload' && !file)) return null;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: initialData || {
      name: file ? file.name.replace(/\.docx$/, '') : '',
      description: '',
      version: '1.0.0',
      type: templateTypes[0],
      contractYear: new Date().getFullYear().toString(),
    },
  });

  useEffect(() => {
    reset(initialData || {
      name: file ? file.name.replace(/\.docx$/, '') : '',
      description: '',
      version: '1.0.0',
      type: templateTypes[0],
      contractYear: new Date().getFullYear().toString(),
    });
  }, [initialData, file, reset]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Template' : 'Upload Template Metadata'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-[80vh]">
          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pb-8 px-4">
            {mode === 'upload' && file && (
              <div>
                <label className="block text-sm font-medium mb-1">DOCX File</label>
                <Input value={file.name} readOnly disabled />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Template Name</label>
              <Input {...register('name')} placeholder="Enter template name" className="w-full focus:ring-2 focus:ring-blue-600 focus:border-blue-600" />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                {...register('description')}
                className="w-full p-2 border rounded-md min-h-[60px] focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                placeholder="Describe this template (e.g., Base Pay, Base Plus Production, Hospital Service)"
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Version</label>
              <Input {...register('version')} placeholder="e.g., 1.0.0" className="focus:ring-2 focus:ring-blue-600 focus:border-blue-600" />
              {errors.version && <p className="text-red-500 text-sm mt-1">{errors.version.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <Input
                {...register('type')}
                list="template-type-list"
                placeholder="e.g., BASE, PRODUCTIVITY, Custom..."
                autoComplete="off"
                className="focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              <datalist id="template-type-list">
                {templateTypes.map(type => (
                  <option key={type} value={type} />
                ))}
              </datalist>
              {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contract Year</label>
              <Input {...register('contractYear')} placeholder="e.g., 2024" className="focus:ring-2 focus:ring-blue-600 focus:border-blue-600" />
              {errors.contractYear && <p className="text-red-500 text-sm mt-1">{errors.contractYear.message}</p>}
            </div>
            {placeholders && placeholders.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Extracted Placeholders</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {placeholders.map(ph => (
                    <span key={ph} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">{ph}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-0 bg-white border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{mode === 'edit' ? 'Save Changes' : 'Save Template'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 