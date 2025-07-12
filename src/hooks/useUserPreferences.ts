import { useState, useEffect, useCallback } from 'react';
import { userPreferencesService, ProviderScreenPreferences } from '@/services/userPreferencesService';
import { toast } from 'sonner';

export function useProviderPreferences() {
  const [preferences, setPreferences] = useState<ProviderScreenPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await userPreferencesService.getProviderPreferences();
        if (prefs) {
          setPreferences(prefs);
        } else {
          // Set default preferences if none exist
          const defaultPreferences: ProviderScreenPreferences = {
            columnVisibility: {},
            columnOrder: [],
            columnPinning: {},
            savedViews: {},
            activeView: 'default',
            filters: {
              specialty: '__all__',
              adminRole: '__all__',
              subspecialty: '__all__',
              agreementDateFrom: '',
              agreementDateTo: '',
              compensationYear: ''
            },
            displaySettings: {
              rowsPerPage: 25,
              compactMode: false,
              showSummaryStats: true
            }
          };
          setPreferences(defaultPreferences);
        }
      } catch (error) {
        console.error('Failed to load user preferences:', error);
        toast.error('Failed to load your saved preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences
  const savePreferences = useCallback(async (newPreferences: ProviderScreenPreferences) => {
    setSaving(true);
    try {
      await userPreferencesService.saveProviderPreferences(newPreferences);
      setPreferences(newPreferences);
      toast.success('Preferences saved successfully');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }, []);

  // Update column visibility
  const updateColumnVisibility = useCallback(async (columnVisibility: Record<string, boolean>) => {
    if (!preferences) return;
    
    const updatedPreferences = {
      ...preferences,
      columnVisibility
    };
    
    setPreferences(updatedPreferences);
    await savePreferences(updatedPreferences);
  }, [preferences, savePreferences]);

  // Update column order
  const updateColumnOrder = useCallback(async (columnOrder: string[]) => {
    if (!preferences) return;
    
    const updatedPreferences = {
      ...preferences,
      columnOrder
    };
    
    setPreferences(updatedPreferences);
    await savePreferences(updatedPreferences);
  }, [preferences, savePreferences]);

  // Update column pinning
  const updateColumnPinning = useCallback(async (columnPinning: { left?: string[]; right?: string[] }) => {
    if (!preferences) return;
    
    const updatedPreferences = {
      ...preferences,
      columnPinning
    };
    
    setPreferences(updatedPreferences);
    await savePreferences(updatedPreferences);
  }, [preferences, savePreferences]);

  // Create saved view
  const createSavedView = useCallback(async (
    viewName: string,
    columnVisibility: Record<string, boolean>,
    columnOrder: string[],
    columnPinning: { left?: string[]; right?: string[] },
    filters?: Record<string, any>
  ) => {
    try {
      await userPreferencesService.createSavedView(viewName, columnVisibility, columnOrder, columnPinning, filters);
      
      // Reload preferences to get the updated saved views
      const updatedPrefs = await userPreferencesService.getProviderPreferences();
      if (updatedPrefs) {
        setPreferences(updatedPrefs);
      }
      
      toast.success(`View "${viewName}" saved successfully`);
    } catch (error) {
      console.error('Failed to create saved view:', error);
      toast.error('Failed to save view');
    }
  }, []);

  // Set active view
  const setActiveView = useCallback(async (viewName: string) => {
    try {
      await userPreferencesService.setActiveView(viewName);
      
      // Reload preferences to get the updated active view
      const updatedPrefs = await userPreferencesService.getProviderPreferences();
      if (updatedPrefs) {
        setPreferences(updatedPrefs);
      }
      
      toast.success(`Switched to "${viewName}" view`);
    } catch (error) {
      console.error('Failed to set active view:', error);
      toast.error('Failed to switch view');
    }
  }, []);

  // Delete saved view
  const deleteSavedView = useCallback(async (viewName: string) => {
    try {
      await userPreferencesService.deleteSavedView(viewName);
      
      // Reload preferences to get the updated saved views
      const updatedPrefs = await userPreferencesService.getProviderPreferences();
      if (updatedPrefs) {
        setPreferences(updatedPrefs);
      }
      
      toast.success(`View "${viewName}" deleted successfully`);
    } catch (error) {
      console.error('Failed to delete saved view:', error);
      toast.error('Failed to delete view');
    }
  }, []);

  // Update filters
  const updateFilters = useCallback(async (filters: ProviderScreenPreferences['filters']) => {
    if (!preferences) return;
    
    const updatedPreferences = {
      ...preferences,
      filters
    };
    
    setPreferences(updatedPreferences);
    await savePreferences(updatedPreferences);
  }, [preferences, savePreferences]);

  // Update display settings
  const updateDisplaySettings = useCallback(async (displaySettings: ProviderScreenPreferences['displaySettings']) => {
    if (!preferences) return;
    
    const updatedPreferences = {
      ...preferences,
      displaySettings
    };
    
    setPreferences(updatedPreferences);
    await savePreferences(updatedPreferences);
  }, [preferences, savePreferences]);

  return {
    preferences,
    loading,
    saving,
    savePreferences,
    updateColumnVisibility,
    updateColumnOrder,
    updateColumnPinning,
    createSavedView,
    setActiveView,
    deleteSavedView,
    updateFilters,
    updateDisplaySettings
  };
} 