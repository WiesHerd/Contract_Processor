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
    <div className="flex w-full h-full">
      {/* Left Panel: Placeholders */}
      <div className="w-1/3 border-r pr-4 py-6 overflow-y-auto bg-slate-50">
        <div className="mb-4">
          <h3 className="font-bold mb-2 text-lg text-blue-700 flex items-center gap-2">
            Placeholders
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-pointer">
                    <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Help" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" align="start">
                  Search and select placeholders to map to provider data fields.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h3>
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search placeholders..."
            className="mb-2"
            aria-label="Search placeholders"
          />
          <span className="text-xs text-gray-500">{filteredPlaceholders.length} of {placeholders.length} placeholders</span>
        </div>
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
        <h3 className="font-bold mb-4 text-lg text-blue-700">Mapping Table</h3>
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
  );
}; 