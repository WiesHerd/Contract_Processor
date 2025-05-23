import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function MappingListPage() {
  const templates = useSelector((state: RootState) => state.templates.templates);
  const mappings = useSelector((state: RootState) => state.mappings.mappings);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      <div className="border-b pb-4 mb-4 bg-white px-4 pt-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold">All Template Mappings</h1>
        <p className="text-gray-500 text-sm mt-1">View and manage all your contract template mappings. Continue mapping to finish or update your field assignments.</p>
      </div>
      
      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template Name</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead>Placeholders</TableHead>
              <TableHead>Mapping Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map(template => {
              const templateMapping = mappings[template.id];
              const mappedCount = templateMapping?.mappings.filter(m => m.mappedColumn).length || 0;
              const totalCount = template.placeholders.length;
              const percent = totalCount === 0 ? 0 : Math.round((mappedCount / totalCount) * 100);
              const isComplete = mappedCount === totalCount && totalCount > 0;
              return (
                <TableRow key={template.id} className="hover:bg-slate-50">
                  <TableCell className="font-semibold text-lg">{template.name}</TableCell>
                  <TableCell>{templateMapping?.lastModified || template.lastModified}</TableCell>
                  <TableCell>{totalCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded h-2 relative">
                        <div
                          className={`h-2 rounded transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{mappedCount} / {totalCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isComplete ? (
                      <CheckCircle className="text-green-600" />
                    ) : (
                      <AlertTriangle className="text-yellow-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="default"
                      className="px-6 py-2 rounded-lg shadow-md"
                      onClick={() => navigate(`/map-fields/${template.id}`)}
                    >
                      {templateMapping ? 'Continue Mapping' : 'Start Mapping'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
} 