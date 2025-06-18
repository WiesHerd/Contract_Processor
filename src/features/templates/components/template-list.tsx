import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { setSelectedTemplate } from '../../../store/slices/templateSlice';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { formatDate } from '../../../utils/format';

export const TemplateList: React.FC = () => {
  const dispatch = useDispatch();
  const { templates, selectedTemplate } = useSelector((state: RootState) => state.templates);

  const handleSelectTemplate = (templateId: string) => {
    dispatch(setSelectedTemplate(templateId));
  };

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No templates uploaded yet. Please upload a template to get started.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead>Tags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow
              key={template.id}
              className={`cursor-pointer hover:bg-muted ${selectedTemplate === template.id ? 'bg-muted' : ''}`}
              onClick={() => handleSelectTemplate(template.id)}
            >
              <TableCell className="font-medium">{template.name}</TableCell>
              <TableCell>{template.version}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {template.compensationModel}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(template.metadata.createdAt)}</TableCell>
              <TableCell>{formatDate(template.metadata.updatedAt)}</TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}; 