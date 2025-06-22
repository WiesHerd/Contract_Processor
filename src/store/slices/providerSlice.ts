import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Provider, ProviderState } from '../../types/provider';
import { awsProviders } from '@/utils/awsServices';
import { CreateProviderInput } from '@/API';
import { RootState } from '../index';
import { awsBulkOperations } from '@/utils/awsServices';

// Selectors
export const selectProviders = (state: RootState) => state.provider.providers;
export const selectProvidersLoading = (state: RootState) => state.provider.loading;
export const selectProvidersError = (state: RootState) => state.provider.error;

// Async thunks
export const fetchProviders = createAsyncThunk(
  'providers/fetchAll',
  async () => {
    const response = await awsProviders.list();
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
    try {
      const onProgress = ({ deleted, total }: { deleted: number, total: number }) => {
        dispatch(providerSlice.actions.setClearProgress({ progress: deleted, total: total }));
      };
      await awsBulkOperations.deleteAllProviders(onProgress);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to clear providers');
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
      return {
        ...state,
        loading: false,
        loadingAction: null,
        providers: action.payload as Provider[],
        lastSync: new Date().toISOString(),
      };
    });
    builder.addCase(fetchProviders.rejected, (state, action) => {
      state.loading = false;
      state.loadingAction = null;
      state.error = action.error.message || 'Failed to fetch providers';
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
  updateProvider,
  removeProvider,
  clearProviders,
  setClearProgress,
  setUploadProgress,
} = providerSlice.actions;

export default providerSlice.reducer; 