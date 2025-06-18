import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { Provider } from '@/types/provider';
import { v4 as uuidv4 } from 'uuid';
import { RootState } from '../../store';
import { Template } from '../../types/template';

interface ProvidersState {
  providers: Provider[];
  uploadedColumns: string[];
  loading: boolean;
  error: string | null;
}

const initialState: ProvidersState = {
  providers: [],
  uploadedColumns: [],
  loading: false,
  error: null,
};

const providersSlice = createSlice({
  name: 'providers',
  initialState,
  reducers: {
    addProvidersFromCSV: (state, action: PayloadAction<Record<string, string>[]>) => {
      state.loading = true;
      try {
        const allowedModels = ['BASE', 'PRODUCTIVITY', 'HYBRID', 'HOSPITALIST', 'LEADERSHIP'];
        const newProviders = action.payload.map(provider => ({
          id: uuidv4(),
          name: provider.name || '',
          credentials: provider.credentials || '',
          specialty: provider.specialty || '',
          startDate: provider.startDate || '',
          fte: isNaN(parseFloat(provider.fte)) ? 0 : parseFloat(provider.fte),
          baseSalary: parseFloat(provider.baseSalary) || 0,
          wRVUTarget: provider.wRVUTarget ? parseFloat(provider.wRVUTarget) : undefined,
          conversionFactor: provider.conversionFactor ? parseFloat(provider.conversionFactor) : undefined,
          retentionBonus: (() => {
            if (typeof provider.retentionBonus === 'string') {
              try {
                const parsed = JSON.parse(provider.retentionBonus);
                if (typeof parsed === 'object' && parsed !== null && 'amount' in parsed) {
                  return parsed;
                }
                const num = parseFloat(provider.retentionBonus);
                if (!isNaN(num)) return { amount: num, vestingPeriod: 0 };
              } catch {
                const num = parseFloat(provider.retentionBonus);
                if (!isNaN(num)) return { amount: num, vestingPeriod: 0 };
              }
            } else if (typeof provider.retentionBonus === 'number') {
              return { amount: provider.retentionBonus, vestingPeriod: 0 };
            }
            return undefined;
          })(),
          templateTag: provider.templateTag,
          compensationModel: (allowedModels.includes((provider.compensationModel || '').toUpperCase()) ? (provider.compensationModel || '').toUpperCase() : 'BASE') as Provider['compensationModel'],
          fteBreakdown: (() => {
            if (Array.isArray(provider.fteBreakdown)) return provider.fteBreakdown;
            if (typeof provider.fteBreakdown === 'string') {
              try {
                const parsed = JSON.parse(provider.fteBreakdown);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            }
            return [];
          })(),
          metadata: {
            updatedAt: new Date().toISOString().split('T')[0],
          },
          ...provider, // Keep any additional fields from CSV
        }));
        state.providers = newProviders;
        state.error = null;
      } catch (error) {
        state.error = 'Failed to process provider data';
      } finally {
        state.loading = false;
      }
    },
    setUploadedColumns: (state, action: PayloadAction<string[]>) => {
      state.uploadedColumns = action.payload;
    },
    updateProvider: (state, action: PayloadAction<Provider>) => {
      const index = state.providers.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.providers[index] = {
          ...action.payload,
          metadata: {
            updatedAt: new Date().toISOString().split('T')[0],
          },
        };
      }
    },
    deleteProvider: (state, action: PayloadAction<string>) => {
      state.providers = state.providers.filter(p => p.id !== action.payload);
    },
    clearProviders: (state) => {
      state.providers = [];
      state.uploadedColumns = [];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

// Memoized selectors
export const selectProviders = (state: RootState) => state.providers.providers;
export const selectUploadedColumns = (state: RootState) => state.providers.uploadedColumns;
export const selectProvidersLoading = (state: RootState) => state.providers.loading;
export const selectProvidersError = (state: RootState) => state.providers.error;

// Memoized selector for provider with matched template
export const selectProviderWithMatchedTemplate = createSelector(
  [
    (state: RootState, providerId: string) => state.providers.providers.find(p => p.id === providerId),
    (state: RootState) => state.templates.templates,
  ],
  (provider, templates) => {
    if (!provider) return null;
    
    // First try to match by templateTag
    if (provider.templateTag) {
      const template = templates.find(t => t.name === provider.templateTag);
      if (template) return { provider, template };
    }

    // If no templateTag match, try to match by compensationModel based on provider data
    let contractModel: Template['compensationModel'] | undefined;
    if (provider.wRVUTarget && provider.conversionFactor) {
      contractModel = 'PRODUCTIVITY';
    } else if (provider.retentionBonus) {
      contractModel = 'HYBRID';
    } else {
      contractModel = 'BASE';
    }
    const template = templates.find(t => t.compensationModel === contractModel);
    return { provider, template };
  }
);

export const {
  addProvidersFromCSV,
  setUploadedColumns,
  updateProvider,
  deleteProvider,
  clearProviders,
  setLoading,
  setError,
} = providersSlice.actions;

export default providersSlice.reducer; 