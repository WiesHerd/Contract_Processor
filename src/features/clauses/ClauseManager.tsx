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
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

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
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Load clauses with caching
  useEffect(() => {
    dispatch(fetchClausesIfNeeded());
  }, [dispatch]);

  // Fallback to static clauses if Redux state is empty and not loading
  const displayClauses = clauses.length > 0 ? clauses : (!loading ? SHARED_CLAUSES : []);

  // Filter and paginate clauses
  const filteredClauses = displayClauses.filter(clause =>
    clause.title.toLowerCase().includes(search.toLowerCase()) ||
    clause.content.toLowerCase().includes(search.toLowerCase()) ||
    clause.category.toLowerCase().includes(search.toLowerCase())
  );
  const paginatedClauses = filteredClauses.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const totalPages = Math.ceil(filteredClauses.length / pageSize);

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
    const newErrors: { title?: string; content?: string } = {};
    if (!form.title.trim()) newErrors.title = 'Title is required.';
    if (!form.content.trim()) newErrors.content = 'Content is required.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setSaving(true);
    const now = new Date().toISOString();
    try {
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
        toast.success('Clause updated successfully!');
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
        toast.success('Clause added successfully!');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error('Failed to save clause. Please try again.');
    } finally {
      setSaving(false);
    }
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
    <div className="min-h-screen bg-gray-50/50 pt-0 pb-4 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Card - Professional Layout */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-lg font-bold text-gray-800">Clause Library</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-pointer">
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Info" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="start">
                    Manage and edit contract clauses for use in templates.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <Button variant="default" className="h-10 px-6 text-base font-semibold" onClick={openAddModal}>Add Clause</Button>
            </div>
          </div>
          <hr className="my-3 border-gray-100" />
        </div>
        {/* Main Card: Filter, pagination, table */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-2">
            <div className="flex flex-col">
              <span className="mb-1 font-medium text-gray-700">Filter Clauses</span>
              <Input
                placeholder="Search clauses by title, content, or category..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPageIndex(0);
                }}
                className="w-64"
              />
            </div>
            {/* Pagination Controls */}
            <div className="flex gap-2 items-center mt-2 sm:mt-0">
              <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(0)}>&laquo;</Button>
              <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(pageIndex - 1)}>&lsaquo;</Button>
              <span className="text-sm">Page {pageIndex + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(pageIndex + 1)}>&rsaquo;</Button>
              <Button variant="outline" size="sm" disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(totalPages - 1)}>&raquo;</Button>
              <select
                className="ml-2 border rounded px-2 py-1 text-sm"
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setPageIndex(0);
                }}
              >
                {[10, 20, 50, 100].map(size => (
                  <option key={size} value={size}>{size} / page</option>
                ))}
              </select>
            </div>
          </div>
          {/* Clause Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Title</TableHead>
                  <TableHead className="min-w-[120px]">Category</TableHead>
                  <TableHead className="min-w-[140px]">Last Updated</TableHead>
                  <TableHead className="min-w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClauses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No clauses found.
                      <Button variant="default" className="ml-4" onClick={openAddModal}>Add Your First Clause</Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedClauses.map((clause, idx) => (
                    <TableRow key={clause.id} className={idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                      <TableCell className="font-medium text-gray-900 max-w-xs truncate" title={clause.title}>{clause.title}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{clause.category}</Badge></TableCell>
                      <TableCell className="text-gray-700">{clause.updatedAt ? new Date(clause.updatedAt).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="mr-1" aria-label="Edit Clause" onClick={() => openEditModal(clause)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" aria-label="Delete Clause" onClick={() => handleDelete(clause.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        {/* Modal - Sectioned, Modern, Professional */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">{editClause ? 'Edit Clause' : 'Add Clause'}</h2>
              <div className="space-y-6">
                {/* Basic Info Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Basic Info</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Title</label>
                      <input
                        className={`w-full border rounded px-3 py-2 ${errors.title ? 'border-red-500' : ''}`}
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        disabled={saving}
                        placeholder="Enter clause title"
                      />
                      {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Category</label>
                      <Select
                        value={form.category}
                        onValueChange={(value: Clause['category']) => setForm(f => ({ ...f, category: value }))}
                        disabled={saving}
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
                  </div>
                </div>
                {/* Clause Content Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Clause Content</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">Content</label>
                    <textarea
                      className={`w-full border rounded px-3 py-2 min-h-[100px] ${errors.content ? 'border-red-500' : ''}`}
                      value={form.content}
                      onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                      disabled={saving}
                      placeholder="Enter clause content"
                    />
                    {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content}</p>}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
                <Button variant="default" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (editClause ? 'Save Changes' : 'Add Clause')}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 