import React from 'react';
import { X, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface GenerationResult {
  providerName: string;
  filename?: string;
  templateName?: string;
  reason?: string;
}

interface BulkGenerationSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  successful: GenerationResult[];
  skipped: GenerationResult[];
}

export function BulkGenerationSummaryModal({
  isOpen,
  onClose,
  successful,
  skipped,
}: BulkGenerationSummaryModalProps) {
  const handleDownloadLog = () => {
    // Create CSV content
    const headers = ['Provider Name', 'Status', 'Template/Reason'];
    const rows = [
      ...successful.map(r => [r.providerName, 'Success', r.templateName]),
      ...skipped.map(r => [r.providerName, 'Skipped', r.reason]),
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `generation_summary_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Contract Generation Summary</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium text-green-900">{successful.length} contracts generated</div>
              <div className="text-sm text-green-700">Successfully processed</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <div className="font-medium text-amber-900">{skipped.length} providers skipped</div>
              <div className="text-sm text-amber-700">Requires attention</div>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {successful.map((result, index) => (
                <TableRow key={`success-${index}`}>
                  <TableCell className="font-medium">{result.providerName}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-700">
                      Success
                    </span>
                  </TableCell>
                  <TableCell>{result.templateName}</TableCell>
                </TableRow>
              ))}
              {skipped.map((result, index) => (
                <TableRow key={`skipped-${index}`}>
                  <TableCell className="font-medium">{result.providerName}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700">
                      Skipped
                    </span>
                  </TableCell>
                  <TableCell>{result.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleDownloadLog}>
            <Download className="mr-2 h-4 w-4" />
            Download Log
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 