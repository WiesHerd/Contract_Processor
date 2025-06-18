import React from 'react';
import { TemplateUploadForm } from '../components/template-upload-form';
import { TemplateList } from '../components/template-list';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { Button } from '../../../components/ui/button';
import { Plus } from 'lucide-react';

export const TemplatesPage: React.FC = () => {
  const [showUploadForm, setShowUploadForm] = React.useState(false);
  const { templates } = useSelector((state: RootState) => state.templates);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Template Management</h1>
        <Button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {showUploadForm ? 'Hide Upload Form' : 'Upload Template'}
        </Button>
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
          <TemplateList />
        </section>
      </div>
    </div>
  );
}; 