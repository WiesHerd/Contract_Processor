import React from 'react';
import { useDispatch } from 'react-redux';
import { Template } from '@/types/template';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface TemplateListProps {
  templates: Template[];
  onEdit: (template: Template) => void;
  onPreview: (template: Template) => void;
  onDelete: (template: Template) => void;
}

export function TemplateList({ templates, onEdit, onPreview, onDelete }: TemplateListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card key={template.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="truncate">{template.name}</span>
              <Badge variant="outline">{template.version}</Badge>
            </CardTitle>
            <CardDescription>
              {template.description || 'No description provided'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium">Compensation Model:</span>
                <Badge className="ml-2" variant="secondary">
                  {template.compensationModel}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium">Last Updated:</span>
                <span className="ml-2 text-sm text-gray-500">
                  {template.metadata?.updatedAt
                    ? format(new Date(template.metadata.updatedAt), 'MMM d, yyyy')
                    : 'Never'}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium">Created By:</span>
                <span className="ml-2 text-sm text-gray-500">
                  {template.metadata?.createdBy || 'Unknown'}
                </span>
              </div>
              {template.placeholders && template.placeholders.length > 0 && (
                <div>
                  <span className="text-sm font-medium block mb-1">Placeholders:</span>
                  <div className="flex flex-wrap gap-1">
                    {template.placeholders.slice(0, 3).map((placeholder) => (
                      <Badge key={placeholder} variant="outline" className="text-xs">
                        {placeholder}
                      </Badge>
                    ))}
                    {template.placeholders.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.placeholders.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPreview(template)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(template)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(template)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
} 