import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  countdown: number;
  onStay: () => void;
  onSignOut: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({ isOpen, countdown, onStay, onSignOut }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6 text-yellow-500" />
            Session Timeout Warning
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-600">
            Your session is about to expire due to inactivity. You will be signed out in{' '}
            <span className="font-bold text-gray-800">{countdown}</span> seconds.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Do you want to stay signed in?
          </p>
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onSignOut}>
            Sign Out
          </Button>
          <Button onClick={onStay}>
            Stay Signed In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 