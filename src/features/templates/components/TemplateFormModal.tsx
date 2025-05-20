import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { X, Loader2 } from 'lucide-react';
import { addTemplate, updateTemplate } from '../templatesSlice';
import { NewTemplateFormData, newTemplateSchema } from '../schemas';
import { Template, TemplateType } from '@/types/template';

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: Template;
}

const templateTypes: TemplateType[] = ['Base', 'Productivity', 'Hybrid', 'Hospital-based'];

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
    defaultValues: template || {
      placeholders: [],
      clauseIds: [],
    },
  });

  // Reset form when template changes
  React.useEffect(() => {
    if (template) {
      reset(template);
    }
  }, [template, reset]);

  const placeholders = watch('placeholders');
  const clauseIds = watch('clauseIds');

  const onSubmit = async (data: NewTemplateFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (isEditMode && template) {
        dispatch(updateTemplate({ ...template, ...data }));
      } else {
        dispatch(
          addTemplate({
            id: uuidv4(),
            ...data,
            lastModified: new Date().toISOString().split('T')[0],
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {isEditMode ? 'Edit Template' : 'Create New Template'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Template Name</label>
            <input
              {...register('name')}
              className="w-full p-2 border rounded-md"
              placeholder="Enter template name"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Version */}
          <div>
            <label className="block text-sm font-medium mb-1">Version</label>
            <input
              {...register('version')}
              className="w-full p-2 border rounded-md"
              placeholder="e.g., 2025.1"
              disabled={isSubmitting}
            />
            {errors.version && (
              <p className="text-red-500 text-sm mt-1">{errors.version.message}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              {...register('type')}
              className="w-full p-2 border rounded-md"
              disabled={isSubmitting}
            >
              <option value="">Select type</option>
              {templateTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
            )}
          </div>

          {/* Placeholders */}
          <div>
            <label className="block text-sm font-medium mb-1">Placeholders</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                className="flex-1 p-2 border rounded-md"
                placeholder="Add placeholder (e.g., ProviderName)"
                disabled={isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.target as HTMLInputElement;
                    const value = input.value.trim();
                    if (value && !placeholders.includes(value)) {
                      setValue('placeholders', [...placeholders, value]);
                      input.value = '';
                    }
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {placeholders.map((placeholder) => (
                <span
                  key={placeholder}
                  className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {placeholder}
                  <button
                    type="button"
                    onClick={() =>
                      setValue(
                        'placeholders',
                        placeholders.filter((p) => p !== placeholder)
                      )
                    }
                    className="ml-1 text-blue-600 hover:text-blue-800"
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
            {errors.placeholders && (
              <p className="text-red-500 text-sm mt-1">
                {errors.placeholders.message}
              </p>
            )}
          </div>

          {/* Clause IDs */}
          <div>
            <label className="block text-sm font-medium mb-1">Clause IDs</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                className="flex-1 p-2 border rounded-md"
                placeholder="Add clause ID"
                disabled={isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.target as HTMLInputElement;
                    const value = input.value.trim();
                    if (value && !clauseIds.includes(value)) {
                      setValue('clauseIds', [...clauseIds, value]);
                      input.value = '';
                    }
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {clauseIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-gray-100 text-gray-800"
                >
                  {id}
                  <button
                    type="button"
                    onClick={() =>
                      setValue(
                        'clauseIds',
                        clauseIds.filter((c) => c !== id)
                      )
                    }
                    className="ml-1 text-gray-600 hover:text-gray-800"
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Docx Template */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Docx Template File
            </label>
            <input
              {...register('docxTemplate')}
              className="w-full p-2 border rounded-md"
              placeholder="Enter template filename"
              disabled={isSubmitting}
            />
            {errors.docxTemplate && (
              <p className="text-red-500 text-sm mt-1">
                {errors.docxTemplate.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 