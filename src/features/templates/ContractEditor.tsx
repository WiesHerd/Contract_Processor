import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { setClauses, addClause, updateClause, deleteClause, setLoading, setError } from '@/store/slices/clauseSlice';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Clause } from '@/types/clause';

const ContractEditor: React.FC = () => {
  const dispatch = useDispatch();
  const { clauses, loading, error } = useSelector((state: RootState) => state.clauses);

  useEffect(() => {
    // Fetch clauses from API or localStorage here
    // For now, we'll simulate fetching with a timeout
    dispatch(setLoading(true));
    setTimeout(() => {
      const now = new Date().toISOString();
      const mockClauses: Clause[] = [
        {
          id: '1',
          title: 'Clause 1',
          content: 'Content 1',
          type: 'standard',
          category: 'other',
          tags: ['tag1'],
          applicableProviderTypes: ['physician'],
          applicableCompensationModels: ['base'],
          createdAt: now,
          updatedAt: now,
          version: '1.0.0'
        },
        {
          id: '2',
          title: 'Clause 2',
          content: 'Content 2',
          type: 'standard',
          category: 'other',
          tags: ['tag2'],
          applicableProviderTypes: ['physician'],
          applicableCompensationModels: ['base'],
          createdAt: now,
          updatedAt: now,
          version: '1.0.0'
        }
      ];
      dispatch(setClauses(mockClauses));
      dispatch(setLoading(false));
    }, 1000);
  }, [dispatch]);

  const handleAddClause = (clause: Clause) => {
    dispatch(addClause(clause));
  };

  const handleUpdateClause = (clause: Clause) => {
    dispatch(updateClause(clause));
  };

  const handleDeleteClause = (id: string) => {
    dispatch(deleteClause(id));
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner 
        size="md" 
        message="Loading contract editor..." 
        color="primary"
      />
    </div>
  );
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Contract Editor</h1>
      <ul>
        {clauses.map(clause => (
          <li key={clause.id}>
            {clause.title} - {clause.content}
            <button onClick={() => handleDeleteClause(clause.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ContractEditor;