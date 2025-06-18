import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDispatch } from 'react-redux';
import { addTemplate, setError, setLoading } from '../../../store/slices/templateSlice';
import { Button } from '../../../components/ui/button';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { AlertCircle, Upload } from 'lucide-react';
import { Template, TemplateSchema } from '../../../types/template';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { CompensationModel } from '../../../types/provider';

export const TemplateUploadForm: React.FC = () => {
  const dispatch = useDispatch();
  const [error, setLocalError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState({
    name: '',
    description: '',
    version: '1.0.0',
    compensationModel: 'BASE' as CompensationModel,
    tags: [] as string[],
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    dispatch(setLoading(true));
    setLocalError(null);

    try {
      const text = await file.text();
      const template: Template = {
        id: crypto.randomUUID(),
        ...metadata,
        clauses: [],
        placeholders: [],
        clauseIds: [],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          lastModifiedBy: 'system',
        },
      };

      // Validate the template
      const validationResult = TemplateSchema.safeParse(template);
      if (!validationResult.success) {
        throw new Error('Invalid template data: ' + validationResult.error.message);
      }

      dispatch(addTemplate(template));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to parse template');
      dispatch(setError(err instanceof Error ? err.message : 'Failed to parse template'));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, metadata]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Template Name</Label>
          <Input
            id="name"
            value={metadata.name}
            onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
            placeholder="Enter template name"
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={metadata.description}
            onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
            placeholder="Enter template description"
          />
        </div>

        <div>
          <Label htmlFor="version">Version</Label>
          <Input
            id="version"
            value={metadata.version}
            onChange={(e) => setMetadata({ ...metadata, version: e.target.value })}
            placeholder="Enter version (e.g., 1.0.0)"
          />
        </div>

        <div>
          <Label htmlFor="compensationModel">Compensation Model</Label>
          <Select
            value={metadata.compensationModel}
            onValueChange={(value) => setMetadata({ ...metadata, compensationModel: value as CompensationModel })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select compensation model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BASE">Base</SelectItem>
              <SelectItem value="PRODUCTIVITY">Productivity</SelectItem>
              <SelectItem value="HYBRID">Hybrid</SelectItem>
              <SelectItem value="HOSPITALIST">Hospitalist</SelectItem>
              <SelectItem value="LEADERSHIP">Leadership</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive
            ? 'Drop the template file here'
            : 'Drag and drop a template file here, or click to select'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Only DOCX files are supported
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}; 