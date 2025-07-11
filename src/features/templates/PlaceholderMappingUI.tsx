import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PlaceholderMappingUIProps {
  placeholders: string[];
  columns: string[];
  dataRows: Record<string, any>[];
  onSave: (mapping: Record<string, { column: string; logic: string }>) => void;
}

export const PlaceholderMappingUI: React.FC<PlaceholderMappingUIProps> = ({
  placeholders,
  columns,
  dataRows,
  onSave,
}) => {
  const [mapping, setMapping] = useState<Record<string, { column: string; logic: string }>>(() => {
    // Auto-map by name (case-insensitive)
    const initial: Record<string, { column: string; logic: string }> = {};
    placeholders.forEach(ph => {
      const match = columns.find(col => col.toLowerCase() === ph.toLowerCase());
      if (match) initial[ph] = { column: match, logic: '' };
    });
    return initial;
  });
  const [selected, setSelected] = useState<string>(placeholders[0] || '');
  const [search, setSearch] = useState('');

  const handleMappingChange = (ph: string, column: string) => {
    setMapping(prev => ({ ...prev, [ph]: { ...prev[ph], column } }));
  };
  const handleLogicChange = (ph: string, logic: string) => {
    setMapping(prev => ({ ...prev, [ph]: { ...prev[ph], logic } }));
  };

  // Filter placeholders based on search
  const filteredPlaceholders = placeholders.filter(ph => 
    ph.toLowerCase().includes(search.toLowerCase())
  );

  const unmapped = placeholders.filter(ph => !mapping[ph]?.column);

  return (
    <div className="w-full h-full">
      {/* Shared Search and Titles Row */}
      <div className="flex items-end gap-8 mb-4">
        <div className="flex-1">
          <h2 className="font-bold text-lg text-blue-700 mb-1">Placeholders</h2>
        </div>
        <div className="flex-1 flex justify-center">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search placeholders..."
            className="max-w-xs"
            aria-label="Search placeholders"
          />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-lg text-blue-700 mb-1 text-right">Mapping Progress</h2>
        </div>
      </div>
      {/* Main Content Row */}
      <div className="flex w-full h-full">
        {/* Left Panel: Placeholders */}
        <div className="w-1/3 border-r pr-4 py-6 overflow-y-auto bg-white">
          <span className="text-xs text-gray-500 block mb-2">{filteredPlaceholders.length} of {placeholders.length} placeholders</span>
          <ul>
            {filteredPlaceholders.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No placeholders match your search.<br />
                <span className="text-xs">Try a different keyword.</span>
              </div>
            ) : (
              filteredPlaceholders.map(ph => (
                <li
                  key={ph}
                  className={`py-2 px-3 rounded cursor-pointer mb-1 flex items-center gap-2 transition-colors ${selected === ph ? 'bg-blue-100' : ''} ${!mapping[ph]?.column ? 'text-red-600 font-semibold' : ''}`}
                  onClick={() => setSelected(ph)}
                  aria-label={`Select ${ph} placeholder`}
                >
                  <span className="font-mono">{`{{${ph}}}`}</span>
                  {!mapping[ph]?.column && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-4 w-4 text-red-400" aria-label="Unmapped" />
                        </TooltipTrigger>
                        <TooltipContent>Unmapped placeholder</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {mapping[ph]?.column && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CheckCircle className="h-4 w-4 text-green-500" aria-label="Mapped" />
                        </TooltipTrigger>
                        <TooltipContent>Mapped placeholder</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
        {/* Right Panel: Mapping Table */}
        <div className="w-2/3 pl-6 py-6 flex flex-col">
          <table className="min-w-full text-sm mb-4">
            <thead>
              <tr>
                <th className="text-left">Placeholder</th>
                <th className="text-left">Mapped Column</th>
                <th className="text-left">Preview Value</th>
                <th className="text-left">Notes/Overrides</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlaceholders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-8">
                    No placeholders match your search.<br />
                    <span className="text-xs">Try a different keyword.</span>
                  </td>
                </tr>
              ) : (
                filteredPlaceholders.map(ph => (
                  <tr key={ph} className={selected === ph ? 'bg-blue-50' : ''}>
                    <td className="font-mono py-2">{`{{${ph}}}`}</td>
                    <td>
                      <Select
                        value={mapping[ph]?.column || 'none'}
                        onValueChange={val => handleMappingChange(ph, val === 'none' ? '' : val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Select --</SelectItem>
                          {columns.map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td>
                      {mapping[ph]?.column && dataRows.length > 0
                        ? dataRows[0][mapping[ph].column] ?? <span className="text-gray-400">N/A</span>
                        : <span className="text-gray-400">Unmapped</span>
                      }
                    </td>
                    <td>
                      <Input
                        className="w-full"
                        placeholder="Notes or logic (optional)"
                        value={mapping[ph]?.logic || ''}
                        onChange={e => handleLogicChange(ph, e.target.value)}
                        aria-label={`Notes for ${ph}`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="flex-1" />
          <div className="flex items-center gap-4 mt-4">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={unmapped.length > 0}
              onClick={() => onSave(mapping)}
              aria-label="Save Mapping"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Mapping
            </Button>
            {unmapped.length > 0 && (
              <span className="text-red-600 text-sm">
                {unmapped.length} unmapped placeholder(s)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 