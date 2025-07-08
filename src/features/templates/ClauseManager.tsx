import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { CLAUSES as SHARED_CLAUSES } from '@/features/clauses/clausesData';
import { awsClauses } from '@/utils/awsServices';
import { Clause } from '@/types/clause';

const initialClauses: Clause[] = SHARED_CLAUSES;

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export default function ClauseManager() {
  const [clauses, setClauses] = useState<Clause[]>(initialClauses);
  const [modalOpen, setModalOpen] = useState(false);
  const [editClause, setEditClause] = useState<Clause | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });

  const openAddModal = () => {
    setEditClause(null);
    setForm({ title: '', content: '' });
    setModalOpen(true);
  };

  const openEditModal = (clause: Clause) => {
    setEditClause(clause);
    setForm({ title: clause.title, content: clause.content });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this clause?')) {
      try {
        await awsClauses.delete({ id });
        setClauses(clauses.filter(c => c.id !== id));
        alert('Clause deleted successfully!');
      } catch (err) {
        console.error('Error deleting clause:', err);
        alert('Failed to delete clause. Please try again.');
      }
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const now = new Date().toISOString();
    try {
      if (editClause) {
        // Update existing clause in DynamoDB
        const updateInput = {
          id: editClause.id,
          text: form.content,
          tags: editClause.tags,
          condition: editClause.conditions?.[0]?.value || undefined,
        };
        const updatedClause = await awsClauses.update(updateInput);
        if (updatedClause) {
          // Transform back to internal format
          const transformedClause: Clause = {
            id: updatedClause.id,
            title: form.title,
            content: updatedClause.text,
            type: 'custom',
            category: editClause.category,
            tags: updatedClause.tags?.filter((tag): tag is string => tag !== null) || [],
            applicableProviderTypes: ['physician'],
            applicableCompensationModels: ['base'],
            createdAt: updatedClause.createdAt,
            updatedAt: updatedClause.updatedAt,
            version: '1.0.0',
          };
          setClauses(clauses.map(c => c.id === editClause.id ? transformedClause : c));
        }
      } else {
        // Create new clause in DynamoDB
        const createInput = {
          text: form.content,
          tags: [],
          condition: undefined,
        };
        const createdClause = await awsClauses.create(createInput);
        if (createdClause) {
          // Transform back to internal format
          const transformedClause: Clause = {
            id: createdClause.id,
            title: form.title,
            content: createdClause.text,
            type: 'custom',
            category: 'other',
            tags: createdClause.tags?.filter((tag): tag is string => tag !== null) || [],
            applicableProviderTypes: ['physician'],
            applicableCompensationModels: ['base'],
            createdAt: createdClause.createdAt,
            updatedAt: createdClause.updatedAt,
            version: '1.0.0',
          };
          setClauses([...clauses, transformedClause]);
        }
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Error saving clause:', err);
      alert('Failed to save clause. Please try again.');
    }
  };

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
            {clauses.map(clause => (
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