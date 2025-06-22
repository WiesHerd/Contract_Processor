import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { X } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { deleteTemplate } from '../templatesSlice';
import { Template } from '@/types/template';

interface DeleteTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template;
}

export function DeleteTemplateDialog({ isOpen, onClose, template }: DeleteTemplateDialogProps) {
  const dispatch = useDispatch();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      dispatch(deleteTemplate(template.id));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Delete Template</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isDeleting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
          </div>
        )}

        <p className="text-gray-600 mb-6">
          Are you sure you want to delete the template "{template.name}"? This action cannot be undone.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
            disabled={isDeleting}
          >
            {isDeleting && <LoadingSpinner size="sm" inline />}
            Delete Template
          </button>
        </div>
      </div>
    </div>
  );
} 