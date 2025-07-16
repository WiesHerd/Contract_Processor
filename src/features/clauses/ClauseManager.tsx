import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { CLAUSES as SHARED_CLAUSES } from '@/features/clauses/clausesData';
import { awsClauses } from '@/utils/awsServices';
import { Clause } from '@/types/clause';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchClausesIfNeeded, addClause, updateClause, deleteClause, loadStaticClauses } from '@/store/slices/clauseSlice';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Pencil, Trash2, ChevronDown, ChevronUp, Copy, FileText, Calendar, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { logSecurityEvent } from '@/store/slices/auditSlice';

const defaultCategories: Clause['category'][] = ['compensation', 'benefits', 'termination', 'restrictive', 'other'];

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Helper function to highlight placeholders in text
const highlightPlaceholders = (text: string) => {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const parts = text.split(placeholderRegex);
  
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      // This is a placeholder
      return (
        <span key={index} className="inline-block bg-blue-100 text-blue-800 px-1 rounded font-mono text-sm">
          {`{{${part}}}`}
        </span>
      );
    }
    return part;
  });
};

// Helper function to count placeholders
const countPlaceholders = (text: string) => {
  const matches = text.match(/\{\{([^}]+)\}\}/g);
  return matches ? matches.length : 0;
};

export default function ClauseManager() {
  const dispatch: AppDispatch = useDispatch();
  const { clauses, loading, error } = useSelector((state: RootState) => state.clauses);
  const [modalOpen, setModalOpen] = useState(false);
  const [editClause, setEditClause] = useState<Clause | null>(null);
  const [form, setForm] = useState<{ title: string; content: string; category: Clause['category'] }>({ title: '', content: '', category: 'other' });
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    // Load custom categories from localStorage on component mount
    try {
      const saved = localStorage.getItem('clause-custom-categories');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading custom categories from localStorage:', error);
      return [];
    }
  });
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // Get all categories (default + custom)
  const allCategories = [...defaultCategories, ...customCategories];

  // Load clauses with caching
  useEffect(() => {
    dispatch(fetchClausesIfNeeded());
  }, [dispatch]);

  // Force load static clauses immediately if Redux state is empty
  useEffect(() => {
    if (clauses.length === 0 && !loading) {
      console.log('No clauses in Redux state, forcing load of static clauses');
      dispatch(loadStaticClauses());
    }
  }, [clauses.length, loading, dispatch]);

  // Force load static clauses if Redux state is empty after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (clauses.length === 0 && !loading) {
        console.log('Forcing load of static clauses after timeout');
        dispatch(loadStaticClauses());
      }
    }, 2000); // Wait 2 seconds for API call to complete

    return () => clearTimeout(timer);
  }, [clauses.length, loading, dispatch]);

  // Fallback to static clauses if Redux state is empty and not loading
  const displayClauses = clauses.length > 0 ? clauses : (!loading ? SHARED_CLAUSES : []);

  // Debug logging
  console.log('ClauseManager Debug:', {
    clausesLength: clauses.length,
    loading,
    displayClausesLength: displayClauses.length,
    sharedClausesLength: SHARED_CLAUSES.length,
    search,
    selectedCategory,
    pageIndex,
    pageSize
  });

  // Debug: Log first few clauses
  console.log('First 5 display clauses:', displayClauses.slice(0, 5).map(c => ({ id: c.id, title: c.title, category: c.category })));

  // Save custom categories to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('clause-custom-categories', JSON.stringify(customCategories));
    } catch (error) {
      console.error('Error saving custom categories to localStorage:', error);
    }
  }, [customCategories]);

  // Filter clauses
  const filteredClauses = displayClauses.filter(clause => {
    const matchesSearch = clause.title.toLowerCase().includes(search.toLowerCase()) ||
                         clause.content.toLowerCase().includes(search.toLowerCase()) ||
                         clause.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || clause.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Paginate clauses
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

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this clause?')) {
      try {
        await dispatch(deleteClause(id));
        toast.success('Clause deleted successfully');
        
        // Log the deletion
        dispatch(logSecurityEvent({
          action: 'clause_deleted',
          details: `Deleted clause: ${clauses.find(c => c.id === id)?.title || 'Unknown'}`,
          category: 'DATA',
          resourceType: 'clause',
          resourceId: id
        }));
      } catch (error) {
        toast.error('Failed to delete clause');
      }
    }
  };

  const handleSave = async () => {
    setErrors({});
    
    if (!form.title.trim()) {
      setErrors(prev => ({ ...prev, title: 'Title is required' }));
      return;
    }
    
    if (!form.content.trim()) {
      setErrors(prev => ({ ...prev, content: 'Content is required' }));
      return;
    }

    setSaving(true);
    try {
      const clauseData: Clause = {
        id: editClause?.id || generateId(),
        title: form.title.trim(),
        content: form.content.trim(),
        type: 'custom',
        category: form.category,
        tags: editClause?.tags || [],
        applicableProviderTypes: editClause?.applicableProviderTypes || ['physician'],
        applicableCompensationModels: editClause?.applicableCompensationModels || ['base'],
        conditions: editClause?.conditions || [],
        createdAt: editClause?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: editClause?.version || '1.0.0',
        metadata: editClause?.metadata || {}
      };

      if (editClause) {
        await dispatch(updateClause(clauseData));
        toast.success('Clause updated successfully');
        
        // Log the update
        dispatch(logSecurityEvent({
          action: 'clause_updated',
          details: `Updated clause: ${clauseData.title}`,
          category: 'DATA',
          resourceType: 'clause',
          resourceId: clauseData.id
        }));
      } else {
        await dispatch(addClause(clauseData));
        toast.success('Clause added successfully');
        
        // Log the creation
        dispatch(logSecurityEvent({
          action: 'clause_created',
          details: `Created clause: ${clauseData.title}`,
          category: 'DATA',
          resourceType: 'clause',
          resourceId: clauseData.id
        }));
      }
      
      setModalOpen(false);
    } catch (error) {
      toast.error(editClause ? 'Failed to update clause' : 'Failed to add clause');
    } finally {
      setSaving(false);
    }
  };

  const toggleRowExpansion = (clauseId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clauseId)) {
        newSet.delete(clauseId);
      } else {
        newSet.add(clauseId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Clause content copied to clipboard');
  };

  const addCustomCategory = () => {
    const trimmedCategory = newCategory.trim();
    if (!trimmedCategory) {
      toast.error('Please enter a valid category name');
      return;
    }
    
    const lowerCategory = trimmedCategory.toLowerCase();
    if (allCategories.includes(lowerCategory)) {
      toast.error('Category already exists');
      return;
    }
    
    setCustomCategories(prev => [...prev, lowerCategory]);
    setNewCategory('');
    setShowAddCategory(false);
    toast.success(`Category "${trimmedCategory}" added successfully`);
    
    // Log the category creation
    dispatch(logSecurityEvent({
      action: 'custom_category_created',
      details: `Created custom category: ${trimmedCategory}`,
      category: 'DATA',
      resourceType: 'clause_category',
      resourceId: lowerCategory
    }));
  };

  const deleteCustomCategory = (categoryToDelete: string) => {
    // Check if any clauses are using this category
    const clausesUsingCategory = displayClauses.filter(clause => clause.category === categoryToDelete);
    
    if (clausesUsingCategory.length > 0) {
      toast.error(`Cannot delete category "${categoryToDelete}" - ${clausesUsingCategory.length} clause(s) are using it`);
      return;
    }
    
    setCustomCategories(prev => prev.filter(cat => cat !== categoryToDelete));
    toast.success(`Category "${categoryToDelete}" deleted successfully`);
    
    // Log the category deletion
    dispatch(logSecurityEvent({
      action: 'custom_category_deleted',
      details: `Deleted custom category: ${categoryToDelete}`,
      category: 'DATA',
      resourceType: 'clause_category',
      resourceId: categoryToDelete
    }));
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

        {/* Filters and Search */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Clauses</label>
              <Input
                placeholder="Search by title, content, or category..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPageIndex(0);
                }}
                className="w-full"
              />
            </div>
            <div className="flex-shrink-0">
              <div className="flex items-end gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <Select value={selectedCategory} onValueChange={(value) => {
                    setSelectedCategory(value);
                    setPageIndex(0);
                  }}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {defaultCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                      {customCategories.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-t border-gray-100 mt-1">
                            Custom Categories
                          </div>
                          {customCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCategory(true)}
                  className="h-10 px-3"
                >
                  Add Category
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info - Temporary */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-yellow-800">Debug Info</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Manual force load of static clauses');
                dispatch(loadStaticClauses());
              }}
              className="h-8 px-3 text-xs"
            >
              Force Load
            </Button>
          </div>
          <div className="text-xs text-yellow-700 space-y-1">
            <div>Redux clauses: {clauses.length}</div>
            <div>Display clauses: {displayClauses.length}</div>
            <div>Static clauses: {SHARED_CLAUSES.length}</div>
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
            <div>Search: "{search}"</div>
            <div>Category: {selectedCategory}</div>
            <div>Page: {pageIndex + 1} of {Math.ceil(filteredClauses.length / pageSize)}</div>
          </div>
        </div>

        {/* Custom Categories Management */}
        {customCategories.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Custom Categories</h3>
              <span className="text-xs text-gray-500">{customCategories.length} custom category{customCategories.length !== 1 ? 'ies' : 'y'}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {customCategories.map(cat => (
                <div key={cat} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
                  <span className="text-sm text-blue-800 capitalize">{cat}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCustomCategory(cat)}
                    className="h-5 w-5 p-0 text-blue-600 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clauses Table - SharePoint Style */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                    {/* Expand/Collapse column */}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">
                    Content
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedClauses.map((clause) => {
                  const isExpanded = expandedRows.has(clause.id);
                  const placeholderCount = countPlaceholders(clause.content);
                  
                  return (
                    <React.Fragment key={clause.id}>
                      {/* Main Row */}
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(clause.id)}
                            className="h-8 w-8 p-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate" title={clause.title}>
                                {clause.title}
                              </p>
                              {placeholderCount > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {placeholderCount} placeholder{placeholderCount !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md">
                            <div className="line-clamp-2">
                              {highlightPlaceholders(clause.content.substring(0, 200))}
                              {clause.content.length > 200 && '...'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline" className="text-xs capitalize">
                            {clause.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {clause.updatedAt ? new Date(clause.updatedAt).toLocaleDateString() : 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(clause.content)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy content</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditModal(clause)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit clause</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(clause.id)}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete clause</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Content Row */}
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium text-gray-900">Full Content</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <FileText className="h-3 w-3" />
                                  <span>{clause.content.length} characters</span>
                                </div>
                              </div>
                              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {highlightPlaceholders(clause.content)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Empty State */}
          {paginatedClauses.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clauses found</h3>
              <p className="text-gray-500 mb-4">
                {search || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first clause.'
                }
              </p>
              {!search && selectedCategory === 'all' && (
                <Button onClick={openAddModal}>Create First Clause</Button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg shadow-sm p-4 mt-4">
            <div className="text-sm text-gray-700">
              Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, filteredClauses.length)} of {filteredClauses.length} clauses
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={pageIndex === 0} 
                onClick={() => setPageIndex(0)}
              >
                &laquo;
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={pageIndex === 0} 
                onClick={() => setPageIndex(pageIndex - 1)}
              >
                &lsaquo;
              </Button>
              <span className="text-sm px-3">Page {pageIndex + 1} of {totalPages}</span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={pageIndex >= totalPages - 1} 
                onClick={() => setPageIndex(pageIndex + 1)}
              >
                &rsaquo;
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={pageIndex >= totalPages - 1} 
                onClick={() => setPageIndex(totalPages - 1)}
              >
                &raquo;
              </Button>
              <select
                className="ml-2 border rounded px-2 py-1 text-sm"
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setPageIndex(0);
                }}
              >
                {[10, 20, 50, 100].map(size => (
                  <option key={size} value={size}>{size} per page</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Add Category Modal */}
        <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Custom Category</DialogTitle>
              <DialogDescription>
                Create a new category for organizing your clauses.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category Name</label>
                <Input
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  placeholder="Enter category name (e.g., compliance, quality, etc.)"
                  onKeyPress={e => e.key === 'Enter' && addCustomCategory()}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCategory(false)}>
                Cancel
              </Button>
              <Button onClick={addCustomCategory}>
                Add Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit/Add Clause Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editClause ? 'Edit Clause' : 'Add Clause'}</DialogTitle>
              <DialogDescription>
                {editClause ? 'Update the clause details below.' : 'Create a new clause for use in contract templates.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <Input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    disabled={saving}
                    placeholder="Enter clause title"
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <Select
                    value={form.category}
                    onValueChange={(value: Clause['category']) => setForm(f => ({ ...f, category: value }))}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Clause Content Section */}
              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                <Textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  disabled={saving}
                  placeholder="Enter clause content. Use {{placeholders}} for dynamic fields."
                  className={`min-h-[200px] ${errors.content ? 'border-red-500' : ''}`}
                />
                {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content}</p>}
                <div className="mt-2 text-xs text-gray-500">
                  {countPlaceholders(form.content)} placeholder{countPlaceholders(form.content) !== 1 ? 's' : ''} detected
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editClause ? 'Save Changes' : 'Add Clause')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 