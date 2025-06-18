import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { X, CheckCircle } from 'lucide-react';
import { addTemplate } from '../templatesSlice';
import { NewTemplateFormData, newTemplateSchema } from '../schemas';
import { TemplateType } from '@/types/template';
import localforage from 'localforage';
import { useState } from 'react';
import PizZip from 'pizzip';

// Enhanced DOCX validation utility
async function validateDocxTemplate(file: File): Promise<{ issues: string[]; placeholders: string[] }> {
  const issues: string[] = [];
  let placeholders: string[] = [];
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    const xml = zip.file('word/document.xml')?.asText();
    if (!xml) {
      issues.push('Could not read document.xml from DOCX. The file may be corrupt or not a valid Word document.');
      return { issues, placeholders };
    }

    // 1. Check for split placeholders
    const runs = Array.from(xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)).map(m => m[1]);
    let buffer = '';
    for (let i = 0; i < runs.length; i++) {
      buffer += runs[i];
      if (buffer.includes('{{') && !buffer.includes('}}')) continue;
      if (buffer.includes('{{') && buffer.includes('}}')) {
        const openIndex = buffer.indexOf('{{');
        const closeIndex = buffer.indexOf('}}');
        if (closeIndex - openIndex > 50) {
          issues.push(`Potentially split tag: ${buffer.slice(openIndex, closeIndex + 2)}`);
        }
        buffer = '';
      }
      if (buffer.length > 200) buffer = '';
    }

    // 2. Check for mismatched tags
    const openTags = (xml.match(/\{\{/g) || []).length;
    const closeTags = (xml.match(/\}\}/g) || []).length;
    if (openTags !== closeTags) {
      issues.push(`Mismatched number of opening ({{) and closing (}}) tags: ${openTags} vs ${closeTags}`);
    }

    // 3. Extract and check for duplicate placeholders
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const allPlaceholders = Array.from(xml.matchAll(placeholderRegex)).map(m => m[1].trim());
    placeholders = Array.from(new Set(allPlaceholders));
    const duplicates = allPlaceholders.filter((item, idx) => allPlaceholders.indexOf(item) !== idx);
    if (duplicates.length > 0) {
      issues.push(`Duplicate placeholders found: ${[...new Set(duplicates)].join(', ')}`);
    }
    if (placeholders.length === 0) {
      issues.push('No placeholders ({{...}}) found in the DOCX file.');
    }
  } catch (err) {
    issues.push('Failed to parse DOCX file. It may be corrupt or not a valid Word document.');
  }
  return { issues, placeholders };
}

interface NewTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const templateTypes: TemplateType[] = ['BASE', 'PRODUCTIVITY', 'HYBRID', 'HOSPITALIST'];

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
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [scanIssues, setScanIssues] = useState<string[]>([]);

  // Handle file input and scan for issues
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setDocxFile(file);
    setScanIssues([]);
    setFileError(null);
    if (file) {
      const { issues, placeholders } = await validateDocxTemplate(file);
      setScanIssues(issues);
      setValue('placeholders', placeholders);
      if (issues.length > 0) {
        setFileError('Template has formatting issues. Please review the error report below.');
      }
    }
  };

  const onSubmit = async (data: NewTemplateFormData) => {
    if (!docxFile) {
      setFileError('Please upload a DOCX template file.');
      return;
    }
    if (scanIssues.length > 0) {
      setFileError('Template has formatting issues. Please fix and re-upload.');
      return;
    }
    setFileError(null);
    try {
      await localforage.setItem(docxFile.name, docxFile);
      const now = new Date().toISOString();
      dispatch(
        addTemplate({
          id: uuidv4(),
          ...data,
          docxTemplate: docxFile.name,
          createdAt: now,
          updatedAt: now,
          description: (data as any).description ?? '',
          content: '',
          placeholders: data.placeholders || [],
          clauseIds: data.clauseIds || [],
        })
      );
      onClose();
    } catch (err) {
      setFileError('Failed to save DOCX file.');
    }
  };

  // Enhanced: Determine if the file is ready for mapping
  const isReadyForMapping = docxFile && scanIssues.length === 0 && placeholders.length > 0;

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

          {/* Docx Template File Upload */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Docx Template File
            </label>
            <input
              type="file"
              accept=".docx"
              onChange={handleFileChange}
              className="w-full p-2 border rounded-md"
            />
            {fileError && (
              <p className="text-red-500 text-sm mt-1 font-semibold">{fileError}</p>
            )}
            {scanIssues.length > 0 && (
              <ul className="text-red-500 text-sm mt-1 list-disc ml-6">
                {scanIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            )}
            {isReadyForMapping && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Template is valid and ready for mapping!
              </div>
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
              disabled={!isReadyForMapping}
            >
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 