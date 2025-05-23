import React from 'react';
import { CLAUSES } from './clauseData';

interface ClauseLibraryProps {
  onInsert: (clauseContent: string) => void;
}

export const ClauseLibrary: React.FC<ClauseLibraryProps> = ({ onInsert }) => (
  <aside className="p-4 border-l w-64 bg-gray-50">
    <h3 className="font-bold mb-2">Clause Library</h3>
    <ul className="space-y-2">
      {CLAUSES.map(clause => (
        <li key={clause.id}>
          <button
            className="text-blue-600 hover:underline"
            onClick={() => onInsert(clause.content)}
            type="button"
          >
            {clause.label}
          </button>
        </li>
      ))}
    </ul>
  </aside>
); 