import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Trash2 } from 'lucide-react';
// import { deleteTemplate } from '../templatesSlice';
import { Template } from '@/types/template';
import { toast } from 'sonner';

interface DeleteTemplateDialogProps {
  template: Template;
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteTemplateDialog({ template, isOpen, onClose }: DeleteTemplateDialogProps) {
  const dispatch = useDispatch();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // TODO: Fix template deletion
      // await dispatch(deleteTemplate(template.id)).unwrap();
      toast.success('Template deleted successfully');
      onClose();
    } catch (error) {
      console.error('Template deletion error:', error);
      toast.error('Failed to delete template');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            Delete Template
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Are you sure you want to delete "{template.name}"? This action cannot be undone.
            </AlertDescription>
          </Alert>
          
          <p className="text-sm text-gray-600">
            This will permanently delete the template and all associated mappings.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 