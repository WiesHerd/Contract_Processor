import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';
import { Template } from '@/types/template';
import { CompensationModel } from '@/types/provider';
import { newTemplateSchema } from '../schemas';
import { addTemplate, updateTemplate } from '../templatesSlice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: Template;
}

interface NewTemplateFormData {
  name: string;
  version: string;
  compensationModel: CompensationModel;
  placeholders: string[];
  clauseIds: string[];
  docxTemplate: string;
}

const templateTypes: CompensationModel[] = ['BASE', 'PRODUCTIVITY', 'HYBRID', 'HOSPITALIST', 'LEADERSHIP'];

export function TemplateFormModal({ isOpen, onClose, template }: TemplateFormModalProps) {
  const dispatch = useDispatch();
  const isEditMode = Boolean(template);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<NewTemplateFormData>({
    resolver: zodResolver(newTemplateSchema),
    defaultValues: template
      ? {
          name: template.name,
          version: template.version,
          compensationModel: template.compensationModel,
          placeholders: template.placeholders,
          clauseIds: template.clauseIds,
          docxTemplate: template.docxTemplate || '',
        }
      : {
          placeholders: [],
          clauseIds: [],
          compensationModel: 'BASE',
        },
  });

  React.useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        version: template.version,
        compensationModel: template.compensationModel,
        placeholders: template.placeholders,
        clauseIds: template.clauseIds,
        docxTemplate: template.docxTemplate || '',
      });
    }
  }, [template, reset]);

  const onSubmit = async (data: NewTemplateFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (isEditMode && template) {
        dispatch(updateTemplate({
          ...template,
          ...data,
          metadata: {
            ...template.metadata,
            updatedAt: new Date().toISOString(),
            lastModifiedBy: 'system',
          },
        }));
      } else {
        const now = new Date().toISOString();
        dispatch(
          addTemplate({
            id: uuidv4(),
            ...data,
            description: '',
            tags: [],
            clauses: [],
            metadata: {
              createdAt: now,
              updatedAt: now,
              createdBy: 'system',
              lastModifiedBy: 'system',
            },
            versionHistory: [],
          })
        );
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Template' : 'Create New Template'}</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter template name"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              {...register('version')}
              placeholder="e.g., 1.0.0"
              disabled={isSubmitting}
            />
            {errors.version && (
              <p className="text-sm text-red-500 mt-1">{errors.version.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="compensationModel">Compensation Model</Label>
            <Select
              value={watch('compensationModel')}
              onValueChange={(value: CompensationModel) => setValue('compensationModel', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select compensation model" />
              </SelectTrigger>
              <SelectContent>
                {templateTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.compensationModel && (
              <p className="text-sm text-red-500 mt-1">{errors.compensationModel.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 