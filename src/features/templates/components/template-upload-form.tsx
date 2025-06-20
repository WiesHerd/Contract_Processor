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
import { v4 as uuidv4 } from 'uuid';

export const TemplateUploadForm: React.FC = () => {
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{
    name: string;
    description: string;
    version: string;
    compensationModel: CompensationModel;
  }>({
    name: '',
    description: '',
    version: '',
    compensationModel: 'BASE',
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      setError('Please upload a valid template file');
      return;
    }

    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const content = reader.result as string;
        const placeholders = Array.from(content.matchAll(/{{([^}]+)}}/g))
          .map(match => match[1])
          .filter((value, index, self) => self.indexOf(value) === index);

        const now = new Date().toISOString();
        const template: Template = {
          id: uuidv4(),
          name: metadata.name,
          description: metadata.description,
          version: metadata.version,
          compensationModel: metadata.compensationModel,
          tags: [],
          clauses: [],
          metadata: {
            createdAt: now,
            updatedAt: now,
            createdBy: 'system',
            lastModifiedBy: 'system',
          },
          docxTemplate: content,
          placeholders,
          clauseIds: [],
          versionHistory: [],
        };

        dispatch(addTemplate(template));
        setMetadata({
          name: '',
          description: '',
          version: '',
          compensationModel: 'BASE',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process template');
      }
    };

    reader.readAsText(file);
  }, [dispatch, metadata]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
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
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? 'Drop the file here' : 'Drag and drop a template file, or click to select'}
        </p>
        <p className="text-xs text-gray-500 mt-1">Only .docx files are supported</p>
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