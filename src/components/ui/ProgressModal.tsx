import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

interface ProgressModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  progress: number; // 0-100
  className?: string;
}

const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  title,
  message,
  progress,
  className,
}) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent
        className={cn('sm:max-w-[425px]', className)}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          <p className="mb-4 text-sm text-muted-foreground">{message}</p>
          {progress > 0 ? (
            <div className="w-full">
              <Progress value={progress} className="w-full" />
              <p className="mt-2 text-xs text-center text-muted-foreground">
                {Math.round(progress)}%
              </p>
            </div>
          ) : (
            <LoadingSpinner size="md" color="primary" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProgressModal;
