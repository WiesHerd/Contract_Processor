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

interface TabSpecificPreferences {
  notGenerated: ColumnPreferences;
  processed: ColumnPreferences;
  all: ColumnPreferences;
}

interface GeneratorPreferences {
  id: string;
  userId: string;
  columnPreferences: TabSpecificPreferences;
  createdAt: string;
  updatedAt: string;
}

const defaultColumnPreferences: ColumnPreferences = {
  columnVisibility: {},
  columnOrder: ['name', 'employeeId', 'providerType', 'specialty', 'subspecialty', 'administrativeRole', 'baseSalary', 'fte', 'startDate', 'compensationModel', 'assignedTemplate'],
  columnPinning: { left: [], right: [] },
  savedViews: {},
  activeView: 'default',
  displaySettings: {
    pageSize: 20,
    showTooltips: true,
  },
};

const defaultTabSpecificPreferences: TabSpecificPreferences = {
  notGenerated: { ...defaultColumnPreferences },
  processed: { ...defaultColumnPreferences },
  all: { ...defaultColumnPreferences },
};

export function useGeneratorPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<TabSpecificPreferences>(defaultTabSpecificPreferences);
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
        const parsedPreferences = JSON.parse(data.columnPreferences);
        // Handle migration from old format to new tab-specific format
        if (parsedPreferences.columnVisibility) {
          // Old format - migrate to new format
          const oldPreferences = parsedPreferences;
          setPreferences({
            notGenerated: { ...defaultColumnPreferences, ...oldPreferences },
            processed: { ...defaultColumnPreferences, ...oldPreferences },
            all: { ...defaultColumnPreferences, ...oldPreferences },
          });
        } else {
          // New format - use as is, but preserve saved column orders
          const mergedPreferences = {
            ...defaultTabSpecificPreferences,
            ...parsedPreferences,
          };
          
          // Ensure we don't overwrite saved column orders with defaults
          Object.keys(parsedPreferences).forEach(tab => {
            if (parsedPreferences[tab]?.columnOrder?.length > 0) {
              mergedPreferences[tab] = {
                ...mergedPreferences[tab],
                columnOrder: parsedPreferences[tab].columnOrder
              };
            }
          });
          

          
          setPreferences(mergedPreferences);
        }
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
  const savePreferences = useCallback(async (newPreferences: TabSpecificPreferences) => {
    console.log('🔧 Preferences: savePreferences called with:', newPreferences);
    if (!user?.username) return;

    try {
      const preferencesString = JSON.stringify(newPreferences);
      console.log('🔧 Preferences: Saving to database:', preferencesString);
      
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
            columnPreferences: preferencesString,
          },
        },
      });

      console.log('🔧 Preferences: Successfully saved to database');
      setPreferences(newPreferences);
    } catch (err: any) {
      console.error('🔧 Preferences: Failed to save generator preferences:', err);
      setError('Failed to save preferences');
    }
  }, [user?.username, client]);

  // Update column visibility for a specific tab
  const updateColumnVisibility = useCallback((visibility: Record<string, boolean>, tab: 'notGenerated' | 'processed' | 'all' = 'notGenerated') => {
    const newPreferences = {
      ...preferences,
      [tab]: {
        ...preferences[tab],
        columnVisibility: visibility,
      },
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Update column order for a specific tab
  const updateColumnOrder = useCallback((order: string[], tab: 'notGenerated' | 'processed' | 'all' = 'notGenerated') => {
    setPreferences(prevPreferences => {
      // Prevent unnecessary updates if the order hasn't actually changed
      const currentOrder = prevPreferences[tab]?.columnOrder || [];
      if (JSON.stringify(currentOrder) === JSON.stringify(order)) {
        return prevPreferences;
      }
      
      const newPreferences = {
        ...prevPreferences,
        [tab]: {
          ...prevPreferences[tab],
          columnOrder: order,
        },
      };
      
      // Save to database asynchronously
      savePreferences(newPreferences);
      
      return newPreferences;
    });
  }, [savePreferences]);

  // Update column pinning for a specific tab
  const updateColumnPinning = useCallback((pinning: { left: string[]; right: string[] }, tab: 'notGenerated' | 'processed' | 'all' = 'notGenerated') => {
    const newPreferences = {
      ...preferences,
      [tab]: {
        ...preferences[tab],
        columnPinning: pinning,
      },
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Create saved view for a specific tab
  const createSavedView = useCallback((name: string, viewData: any, tab: 'notGenerated' | 'processed' | 'all' = 'notGenerated') => {
    const newPreferences = {
      ...preferences,
      [tab]: {
        ...preferences[tab],
        savedViews: {
          ...preferences[tab].savedViews,
          [name]: viewData,
        },
      },
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Set active view for a specific tab
  const setActiveView = useCallback((viewName: string, tab: 'notGenerated' | 'processed' | 'all' = 'notGenerated') => {
    const newPreferences = {
      ...preferences,
      [tab]: {
        ...preferences[tab],
        activeView: viewName,
      },
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Delete saved view for a specific tab
  const deleteSavedView = useCallback((name: string, tab: 'notGenerated' | 'processed' | 'all' = 'notGenerated') => {
    const newSavedViews = { ...preferences[tab].savedViews };
    delete newSavedViews[name];
    
    const newPreferences = {
      ...preferences,
      [tab]: {
        ...preferences[tab],
        savedViews: newSavedViews,
        activeView: preferences[tab].activeView === name ? 'default' : preferences[tab].activeView,
      },
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Update display settings for a specific tab
  const updateDisplaySettings = useCallback((settings: Partial<ColumnPreferences['displaySettings']>, tab: 'notGenerated' | 'processed' | 'all' = 'notGenerated') => {
    const newPreferences = {
      ...preferences,
      [tab]: {
        ...preferences[tab],
        displaySettings: {
          ...preferences[tab].displaySettings,
          ...settings,
        },
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