import React from 'react';
import { X, Download, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
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

  const total = successful.length + skipped.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0">
        <DialogHeader className="border-b px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center justify-between w-full">
            <span>Contract Generation Summary</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 pt-4 pb-2 bg-gray-50 border-b">
          <div className="flex items-center gap-2 text-base font-medium">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-gray-900">{total} processed</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-green-700">{successful.length} succeeded</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-amber-700">{skipped.length} skipped</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Info className="h-4 w-4 text-blue-400" />
            <span title="The numbers shown reflect the actual records processed in real time.">
              Real-time record count
            </span>
          </div>
        </div>

        {/* Details Table */}
        <div className="px-6 pt-4 pb-2">
          <ScrollArea className="h-[400px] rounded-md border">
            <Table className="min-w-full text-sm">
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="font-semibold">Provider Name</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {successful.map((result, index) => (
                  <TableRow key={`success-${index}`} className={index % 2 === 0 ? 'bg-green-50/40' : ''}>
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
                  <TableRow key={`skipped-${index}`} className={index % 2 === 0 ? 'bg-amber-50/40' : ''}>
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
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row justify-end gap-2 px-6 pb-6 pt-4 border-t bg-gray-50">
          <Button variant="outline" onClick={handleDownloadLog} className="font-semibold">
            <Download className="mr-2 h-4 w-4" />
            Download Log
          </Button>
          <Button onClick={onClose} className="font-semibold">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 