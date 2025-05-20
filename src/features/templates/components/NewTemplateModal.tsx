import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { X } from 'lucide-react';
import { addTemplate } from '../templatesSlice';
import { NewTemplateFormData, newTemplateSchema } from '../schemas';
import { TemplateType } from '@/types/template';

interface NewTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const templateTypes: TemplateType[] = ['Base', 'Productivity', 'Hybrid', 'Hospital-based'];

export function NewTemplateModal({ isOpen, onClose }: NewTemplateModalProps) {
  const dispatch = useDispatch();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<NewTemplateFormData>({
    resolver: zodResolver(newTemplateSchema),
    defaultValues: {
      placeholders: [],
      clauseIds: [],
    },
  });

  const placeholders = watch('placeholders');
  const clauseIds = watch('clauseIds');

  const onSubmit = (data: NewTemplateFormData) => {
    dispatch(
      addTemplate({
        id: uuidv4(),
        ...data,
        lastModified: new Date().toISOString().split('T')[0],
      })
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Create New Template</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Template Name</label>
            <input
              {...register('name')}
              className="w-full p-2 border rounded-md"
              placeholder="Enter template name"
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
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 