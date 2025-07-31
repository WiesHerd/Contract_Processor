import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Provider, ProviderState } from '../../types/provider';
import { awsProviders } from '@/utils/awsServices';
import { CreateProviderInput } from '@/API';
import { RootState } from '../index';
import { awsBulkOperations } from '@/utils/awsServices';
import { toast } from 'sonner';

// Selectors
export const selectProviders = (state: RootState) => state.provider.providers;
export const selectProvidersLoading = (state: RootState) => state.provider.loading;
export const selectProvidersError = (state: RootState) => state.provider.error;

// Async thunks
export const fetchProviders = createAsyncThunk(
  'providers/fetchAll',
  async (year?: number) => {
    const response = await awsProviders.list(year);
    return response;
  }
);

// Add a new thunk for conditional fetching with caching
export const fetchProvidersIfNeeded = createAsyncThunk(
  'providers/fetchIfNeeded',
  async (_, { getState, dispatch }) => {
    const state = getState() as any;
    const { providers, lastSync, loading } = state.provider;
    
    const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
    const now = new Date().getTime();
    const lastSyncTime = lastSync ? new Date(lastSync).getTime() : 0;
    
    // Fetch if:
    // 1. Currently loading (let it finish)
    // 2. There are no providers loaded
    // 3. The data is stale (older than 5 minutes)
    if (!loading && (providers.length === 0 || (now - lastSyncTime > CACHE_DURATION_MS))) {
      return dispatch(fetchProviders(undefined));
    }
    
    // Return existing data if cache is still valid
    return { payload: providers };
  }
);

// New thunk for fetching providers by year
export const fetchProvidersByYear = createAsyncThunk(
  'providers/fetchByYear',
  async (year: number) => {
    console.log('providerSlice: fetchProvidersByYear called with year:', year);
    const response = await awsProviders.list(year);
    console.log('providerSlice: awsProviders.list returned:', response);
    return response;
  }
);

export const uploadProviders = createAsyncThunk(
  'providers/upload',
  async (providers: CreateProviderInput[], { dispatch }) => {
    const onProgress = ({ uploaded, total }: { uploaded: number, total: number }) => {
      dispatch(providerSlice.actions.setUploadProgress({ progress: uploaded, total: total }));
    };
    await awsBulkOperations.createProviders(providers, onProgress);
    return true;
  }
);

export const clearAllProviders = createAsyncThunk(
  'providers/clearAllProviders',
  async (_, { dispatch, rejectWithValue }) => {
    console.log('clearAllProviders thunk: Starting...');
    try {
      const onProgress = ({ deleted, total }: { deleted: number, total: number }) => {
        console.log('clearAllProviders thunk: Progress update:', { deleted, total });
        dispatch(providerSlice.actions.setClearProgress({ progress: deleted, total: total }));
      };
      console.log('clearAllProviders thunk: Calling awsBulkOperations.deleteAllProviders...');
      await awsBulkOperations.deleteAllProviders(onProgress);
      console.log('clearAllProviders thunk: Completed successfully');
      return true;
    } catch (error: any) {
      console.error('clearAllProviders thunk: Error:', error);
      return rejectWithValue(error.message || 'Failed to clear providers');
    }
  }
);

export const updateProvider = createAsyncThunk(
  'providers/updateProvider',
  async (provider: Provider, { rejectWithValue }) => {
    try {
      const updated = await awsProviders.update(provider as any);
      toast.success('Provider updated successfully.');
      return updated;
    } catch (error: any) {
      toast.error('Failed to update provider.');
      return rejectWithValue(error.message || 'Failed to update provider');
    }
  }
);

const initialState: ProviderState = {
  providers: [],
  selectedProviders: [],
  error: null,
  loading: false,
  loadingAction: null,
  lastSync: null,
  uploadedColumns: [],
  clearProgress: undefined,
  clearTotal: undefined,
  uploadProgress: undefined,
  uploadTotal: undefined,
};

const providerSlice = createSlice({
  name: 'provider',
  initialState,
  reducers: {
    setProviders: (state, action: PayloadAction<Provider[]>) => {
      state.providers = action.payload;
    },
    setUploadedColumns: (state, action: PayloadAction<string[]>) => {
      state.uploadedColumns = action.payload;
    },
    addProvidersFromCSV: (state, action: PayloadAction<Provider[]>) => {
      // Basic merge, newer CSV data overwrites existing if IDs match
      const newProviders = [...state.providers];
      action.payload.forEach(csvProvider => {
        const existingIndex = newProviders.findIndex(p => p.id === csvProvider.id);
        if (existingIndex !== -1) {
          newProviders[existingIndex] = { ...newProviders[existingIndex], ...csvProvider } as unknown as Provider;
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
      state.providers.push(action.payload as unknown as Provider);
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
    setClearProgress: (state, action: PayloadAction<{ progress: number; total: number }>) => {
      state.clearProgress = action.payload.progress;
      state.clearTotal = action.payload.total;
    },
    setUploadProgress: (state, action: PayloadAction<{ progress: number; total: number }>) => {
      state.uploadProgress = action.payload.progress;
      state.uploadTotal = action.payload.total;
    },
  },
  extraReducers: (builder) => {
    // Fetch Providers
    builder.addCase(fetchProviders.pending, (state) => {
      state.loading = true;
      state.loadingAction = 'fetching';
      state.error = null;
    });
    builder.addCase(fetchProviders.fulfilled, (state, action) => {
      state.loading = false;
      state.loadingAction = null;
      state.providers = action.payload as unknown as Provider[];
      state.lastSync = new Date().toISOString();
    });
    builder.addCase(fetchProviders.rejected, (state, action) => {
      state.loading = false;
      state.loadingAction = null;
      state.error = action.error.message || 'Failed to fetch providers';
      // Defensive: clear providers if fetch fails
      state.providers = [];
    });

    // Upload Providers
    builder.addCase(uploadProviders.pending, (state) => {
      state.loading = true;
      state.loadingAction = 'uploading';
      state.error = null;
      state.uploadProgress = 0;
      state.uploadTotal = 0;
    });
    builder.addCase(uploadProviders.fulfilled, (state) => {
      state.loading = false;
      state.loadingAction = null;
      state.uploadProgress = undefined;
      state.uploadTotal = undefined;
    });
    builder.addCase(uploadProviders.rejected, (state, action) => {
      state.loading = false;
      state.loadingAction = null;
      state.error = action.error.message || 'Failed to upload providers';
      state.uploadProgress = undefined;
      state.uploadTotal = undefined;
    });

    // Clear All Providers
    builder.addCase(clearAllProviders.pending, (state) => {
      state.loading = true;
      state.loadingAction = 'clearing';
      state.error = null;
      state.clearProgress = 0;
      state.clearTotal = 0;
    });
    builder.addCase(clearAllProviders.fulfilled, (state) => {
      state.loading = false;
      state.loadingAction = null;
      state.providers = [];
      state.selectedProviders = [];
      state.lastSync = new Date().toISOString();
      state.clearProgress = undefined;
      state.clearTotal = undefined;
    });
    builder.addCase(clearAllProviders.rejected, (state, action) => {
      state.loading = false;
      state.loadingAction = null;
      state.error = action.error.message || 'Failed to clear providers';
      state.clearProgress = undefined;
      state.clearTotal = undefined;
    });

    // Fetch Providers If Needed
    builder.addCase(fetchProvidersIfNeeded.fulfilled, (state, action) => {
      // Only update if we actually fetched new data
      if (action.payload && Array.isArray(action.payload)) {
        state.providers = action.payload;
        state.lastSync = new Date().toISOString();
      }
      state.loading = false;
      state.loadingAction = null;
    });

    // Fetch Providers By Year
    builder.addCase(fetchProvidersByYear.pending, (state) => {
      console.log('providerSlice: fetchProvidersByYear.pending');
      state.loading = true;
      state.loadingAction = 'fetchingByYear';
      state.error = null;
    });
    builder.addCase(fetchProvidersByYear.fulfilled, (state, action) => {
      console.log('providerSlice: fetchProvidersByYear.fulfilled with', action.payload?.length || 0, 'providers');
      state.loading = false;
      state.loadingAction = null;
      state.providers = action.payload as unknown as Provider[];
      state.lastSync = new Date().toISOString();
    });
    builder.addCase(fetchProvidersByYear.rejected, (state, action) => {
      console.log('providerSlice: fetchProvidersByYear.rejected with error:', action.error.message);
      state.loading = false;
      state.loadingAction = null;
      state.error = action.error.message || 'Failed to fetch providers by year';
      // Defensive: clear providers if fetch fails
      state.providers = [];
    });

    // Update Provider
    builder.addCase(updateProvider.fulfilled, (state, action) => {
      if (action.payload) {
        const index = state.providers.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.providers[index] = {
            ...action.payload,
            compensationType: action.payload.compensationType as "BASE" | "PRODUCTIVITY" | "HYBRID" | "HOSPITALIST" | "LEADERSHIP",
            compensationModel: action.payload.compensationModel as "BASE" | "PRODUCTIVITY" | "HYBRID" | "HOSPITALIST" | "LEADERSHIP"
          } as unknown as Provider;
        }
      }
    });
    builder.addCase(updateProvider.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to update provider';
    });

    // Defensive: catch-all for any thunk that leaves loading stuck
    builder.addDefaultCase((state) => {
      if (state.loading && !state.loadingAction) {
        state.loading = false;
      }
    });
  },
});

export const {
  setProviders,
  setUploadedColumns,
  addProvidersFromCSV,
  setError,
  setLoading,
  setSelectedProviders,
  addProvider,
  removeProvider,
  clearProviders,
  setClearProgress,
  setUploadProgress,
} = providerSlice.actions;

export default providerSlice.reducer; 