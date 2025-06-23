import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { CLAUSES as SHARED_CLAUSES } from '@/features/clauses/clausesData';
import { saveClause } from '@/utils/s3Storage';
import { Clause } from '@/types/clause';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchClausesIfNeeded, addClause, updateClause, deleteClause } from '@/store/slices/clauseSlice';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const clauseCategories: Clause['category'][] = ['compensation', 'benefits', 'termination', 'restrictive', 'other'];

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export default function ClauseManager() {
  const dispatch: AppDispatch = useDispatch();
  const { clauses, loading, error } = useSelector((state: RootState) => state.clauses);
  const [modalOpen, setModalOpen] = useState(false);
  const [editClause, setEditClause] = useState<Clause | null>(null);
  const [form, setForm] = useState<{ title: string; content: string; category: Clause['category'] }>({ title: '', content: '', category: 'other' });

  // Load clauses with caching
  useEffect(() => {
    dispatch(fetchClausesIfNeeded());
  }, [dispatch]);

  // Fallback to static clauses if Redux state is empty and not loading
  const displayClauses = clauses.length > 0 ? clauses : (!loading ? SHARED_CLAUSES : []);

  const openAddModal = () => {
    setEditClause(null);
    setForm({ title: '', content: '', category: 'other' });
    setModalOpen(true);
  };

  const openEditModal = (clause: Clause) => {
    setEditClause(clause);
    setForm({ title: clause.title, content: clause.content, category: clause.category });
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this clause?')) {
      dispatch(deleteClause(id));
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const now = new Date().toISOString();
    if (editClause) {
      const updatedClause: Clause = {
        ...editClause,
        title: form.title,
        content: form.content,
        category: form.category,
        updatedAt: now,
      };
      await saveClause(updatedClause);
      dispatch(updateClause(updatedClause));
    } else {
      const newClause: Clause = {
        id: generateId(),
        title: form.title,
        content: form.content,
        type: 'custom',
        category: form.category,
        tags: [],
        applicableProviderTypes: ['physician'],
        applicableCompensationModels: ['base'],
        createdAt: now,
        updatedAt: now,
        version: '1.0.0',
      };
      await saveClause(newClause);
      dispatch(addClause(newClause));
    }
    setModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner 
          size="lg" 
          message="Loading Clauses..." 
          color="primary"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-red-500">
        <p className="mt-4 text-lg text-center">{error}</p>
        <Button onClick={() => dispatch(fetchClausesIfNeeded())} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <PageHeader
        title="Clause Library"
        description="Manage and edit contract clauses for use in templates."
        rightContent={
          <Button variant="default" className="h-10 px-6 text-base font-semibold" onClick={openAddModal}>Add Clause</Button>
        }
      />
      <div className="bg-white rounded-lg shadow p-6">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 border-b text-gray-700 font-semibold">Title</th>
              <th className="text-left p-2 border-b text-gray-700 font-semibold">Category</th>
              <th className="text-left p-2 border-b text-gray-700 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayClauses.map(clause => (
              <tr key={clause.id} className="hover:bg-gray-50">
                <td className="p-2 border-b font-medium text-gray-900">{clause.title}</td>
                <td className="p-2 border-b text-gray-700">{clause.category}</td>
                <td className="p-2 border-b">
                  <Button size="sm" variant="outline" className="mr-2" onClick={() => openEditModal(clause)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(clause.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">{editClause ? 'Edit Clause' : 'Add Clause'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Select
                  value={form.category}
                  onValueChange={(value: Clause['category']) => setForm(f => ({ ...f, category: value }))}
                >
                  <SelectTrigger className="w-full border rounded px-3 py-2">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {clauseCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  className="w-full border rounded px-3 py-2 min-h-[100px]"
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="default" onClick={handleSave}>{editClause ? 'Save Changes' : 'Add Clause'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 