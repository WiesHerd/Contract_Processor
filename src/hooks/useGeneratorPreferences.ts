import { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/api';
import { useAuth } from '@/contexts/AuthContext';

interface ColumnPreferences {
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  columnPinning: {
    left: string[];
    right: string[];
  };
  savedViews: Record<string, any>;
  activeView: string;
  displaySettings: {
    pageSize: number;
    showTooltips: boolean;
  };
}

interface GeneratorPreferences {
  id: string;
  userId: string;
  columnPreferences: ColumnPreferences;
  createdAt: string;
  updatedAt: string;
}

const defaultColumnPreferences: ColumnPreferences = {
  columnVisibility: {},
  columnOrder: [],
  columnPinning: { left: [], right: [] },
  savedViews: {},
  activeView: 'default',
  displaySettings: {
    pageSize: 20,
    showTooltips: true,
  },
};

export function useGeneratorPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<ColumnPreferences>(defaultColumnPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const client = generateClient();

  // Load preferences from DynamoDB
  const loadPreferences = useCallback(async () => {
    if (!user?.username) return;

    try {
      setLoading(true);
      setError(null);

      const result = await client.graphql({
        query: /* GraphQL */ `
          query GetGeneratorPreferences($userId: String!) {
            generatorPreferencesByUserId(userId: $userId) {
              items {
                id
                userId
                columnPreferences
                createdAt
                updatedAt
              }
            }
          }
        `,
        variables: { userId: user.username },
      });

      const data = (result as any).data?.generatorPreferencesByUserId?.items?.[0];
      if (data) {
        setPreferences({
          ...defaultColumnPreferences,
          ...JSON.parse(data.columnPreferences),
        });
      }
    } catch (err: any) {
      // Only log the error once and don't spam the console
      if (!err.message?.includes('not found') && !err.message?.includes('Validation error')) {
        console.warn('Failed to load generator preferences:', err);
        setError('Failed to load preferences');
      } else {
        // This is expected for new users or when preferences don't exist yet
        console.log('No existing generator preferences found, using defaults');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.username, client]);

  // Save preferences to DynamoDB
  const savePreferences = useCallback(async (newPreferences: ColumnPreferences) => {
    if (!user?.username) return;

    try {
      await client.graphql({
        query: /* GraphQL */ `
          mutation CreateGeneratorPreferences($input: CreateGeneratorPreferencesInput!) {
            createGeneratorPreferences(input: $input) {
              id
              userId
              columnPreferences
              createdAt
              updatedAt
            }
          }
        `,
        variables: {
          input: {
            userId: user.username,
            columnPreferences: JSON.stringify(newPreferences),
          },
        },
      });

      setPreferences(newPreferences);
    } catch (err: any) {
      console.error('Failed to save generator preferences:', err);
      setError('Failed to save preferences');
    }
  }, [user?.username, client]);

  // Update column visibility
  const updateColumnVisibility = useCallback((visibility: Record<string, boolean>) => {
    const newPreferences = {
      ...preferences,
      columnVisibility: visibility,
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Update column order
  const updateColumnOrder = useCallback((order: string[]) => {
    const newPreferences = {
      ...preferences,
      columnOrder: order,
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Update column pinning
  const updateColumnPinning = useCallback((pinning: { left: string[]; right: string[] }) => {
    const newPreferences = {
      ...preferences,
      columnPinning: pinning,
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Create saved view
  const createSavedView = useCallback((name: string, viewData: any) => {
    const newPreferences = {
      ...preferences,
      savedViews: {
        ...preferences.savedViews,
        [name]: viewData,
      },
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Set active view
  const setActiveView = useCallback((viewName: string) => {
    const newPreferences = {
      ...preferences,
      activeView: viewName,
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Delete saved view
  const deleteSavedView = useCallback((name: string) => {
    const newSavedViews = { ...preferences.savedViews };
    delete newSavedViews[name];
    
    const newPreferences = {
      ...preferences,
      savedViews: newSavedViews,
      activeView: preferences.activeView === name ? 'default' : preferences.activeView,
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Update display settings
  const updateDisplaySettings = useCallback((settings: Partial<ColumnPreferences['displaySettings']>) => {
    const newPreferences = {
      ...preferences,
      displaySettings: {
        ...preferences.displaySettings,
        ...settings,
      },
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    error,
    updateColumnVisibility,
    updateColumnOrder,
    updateColumnPinning,
    createSavedView,
    setActiveView,
    deleteSavedView,
    updateDisplaySettings,
    refresh: loadPreferences,
  };
} 