import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Provider, ProviderState } from '../../types/provider';
import { awsProviders } from '@/utils/awsServices';
import { CreateProviderInput } from '@/API';
import { RootState } from '../index';

// Selectors
export const selectProviders = (state: RootState) => state.provider.providers;
export const selectProvidersLoading = (state: RootState) => state.provider.loading;
export const selectProvidersError = (state: RootState) => state.provider.error;

// Async thunks
export const fetchProviders = createAsyncThunk(
  'providers/fetchProviders',
  async () => {
    const result = await awsProviders.list();
    return result?.items?.filter((item): item is NonNullable<typeof item> => item !== null) || [];
  }
);

export const uploadProviders = createAsyncThunk(
  'providers/uploadProviders',
  async (providers: CreateProviderInput[]) => {
    const result = await awsProviders.batchCreate(providers);
    return result;
  }
);

export const clearAllProviders = createAsyncThunk(
  'providers/clearAllProviders',
  async () => {
    const result = await awsProviders.list();
    if (result?.items) {
      await Promise.all(
        result.items
          .filter((provider): provider is NonNullable<typeof provider> => provider !== null)
          .map(provider => awsProviders.delete({ id: provider.id }))
      );
    }
    return true;
  }
);

const initialState: ProviderState = {
  providers: [],
  selectedProviders: [],
  error: null,
  loading: false,
  lastSync: null,
  uploadedColumns: [],
};

const providerSlice = createSlice({
  name: 'provider',
  initialState,
  reducers: {
    setUploadedColumns: (state, action: PayloadAction<string[]>) => {
      state.uploadedColumns = action.payload;
    },
    addProvidersFromCSV: (state, action: PayloadAction<Provider[]>) => {
      // Basic merge, newer CSV data overwrites existing if IDs match
      const newProviders = [...state.providers];
      action.payload.forEach(csvProvider => {
        const existingIndex = newProviders.findIndex(p => p.id === csvProvider.id);
        if (existingIndex !== -1) {
          newProviders[existingIndex] = { ...newProviders[existingIndex], ...csvProvider };
        } else {
          newProviders.push(csvProvider);
        }
      });
      state.providers = newProviders;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setSelectedProviders: (state, action: PayloadAction<string[]>) => {
      state.selectedProviders = action.payload;
    },
    addProvider: (state, action: PayloadAction<Provider>) => {
      state.providers.push(action.payload);
    },
    updateProvider: (state, action: PayloadAction<Provider>) => {
      const index = state.providers.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.providers[index] = action.payload;
      }
    },
    removeProvider: (state, action: PayloadAction<string>) => {
      state.providers = state.providers.filter(p => p.id !== action.payload);
      state.selectedProviders = state.selectedProviders.filter(id => id !== action.payload);
    },
    clearProviders: (state) => {
      state.providers = [];
      state.selectedProviders = [];
      state.lastSync = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Providers
    builder.addCase(fetchProviders.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchProviders.fulfilled, (state, action) => {
      return {
        ...state,
        loading: false,
        providers: action.payload as Provider[],
        lastSync: new Date().toISOString(),
      };
    });
    builder.addCase(fetchProviders.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch providers';
    });

    // Upload Providers
    builder.addCase(uploadProviders.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(uploadProviders.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(uploadProviders.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to upload providers';
    });

    // Clear All Providers
    builder.addCase(clearAllProviders.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(clearAllProviders.fulfilled, (state) => {
      state.loading = false;
      state.providers = [];
      state.selectedProviders = [];
      state.lastSync = new Date().toISOString();
    });
    builder.addCase(clearAllProviders.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to clear providers';
    });
  },
});

export const {
  setUploadedColumns,
  addProvidersFromCSV,
  setError,
  setLoading,
  setSelectedProviders,
  addProvider,
  updateProvider,
  removeProvider,
  clearProviders,
} = providerSlice.actions;

export default providerSlice.reducer; 