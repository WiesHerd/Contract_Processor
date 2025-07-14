import React from 'react';
import { TemplateUploadForm } from '../components/template-upload-form';
import { TemplateList } from '../components/template-list';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { Button } from '../../../components/ui/button';
import { Plus, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '../../../components/ui/tooltip';
import TemplatePreviewPanel from '../components/TemplatePreviewPanel';
import { Dialog, DialogContent } from '../../../components/ui/dialog';

export const TemplatesPage: React.FC = () => {
  const [showUploadForm, setShowUploadForm] = React.useState(false);
  const { templates } = useSelector((state: RootState) => state.templates);
  const [previewTemplateId, setPreviewTemplateId] = React.useState<string | null>(null);

  const handlePreview = (template: any) => {
    setPreviewTemplateId(template.id);
  };

  return (
    <div className={`min-h-screen bg-gray-50/50 pt-0 pb-4 px-2 sm:px-4`}>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6" style={{ marginTop: '-32px', paddingTop: 0 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-800">Template Manager</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-pointer">
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Info" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="start">
                    Manage your contract templates. Upload a DOCX to extract placeholders, or create a new template from scratch.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {showUploadForm ? 'Hide Upload Form' : 'Upload DOCX'}
              </Button>
              <Button
                variant="destructive"
                className="ml-2"
                // onClick={handleDeleteAllTemplates} // Add your handler here
              >
                Delete All Templates
              </Button>
            </div>
          </div>
          <hr className="my-3 border-gray-100" />
        </div>
        <div className="grid gap-8">
          {showUploadForm && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Upload Template</h2>
              <TemplateUploadForm />
            </section>
          )}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              Templates ({templates.length})
            </h2>
            <TemplateList templates={templates} onPreview={handlePreview} onEdit={() => {}} onDelete={() => {}} />
          </section>
        </div>
        {previewTemplateId && (
          <Dialog open={!!previewTemplateId} onOpenChange={() => setPreviewTemplateId(null)}>
            <DialogContent className="max-w-4xl">
              <TemplatePreviewPanel templateId={previewTemplateId} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}; 