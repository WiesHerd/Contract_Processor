import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Provider, ProviderState } from '../../types/provider';

const initialState: ProviderState = {
  providers: [],
  selectedProviders: [],
  loading: false,
  error: null,
};

const providerSlice = createSlice({
  name: 'providers',
  initialState,
  reducers: {
    setProviders: (state, action: PayloadAction<Provider[]>) => {
      state.providers = action.payload;
      state.error = null;
    },
    addProvider: (state, action: PayloadAction<Provider>) => {
      state.providers.push(action.payload);
      state.error = null;
    },
    updateProvider: (state, action: PayloadAction<Provider>) => {
      const index = state.providers.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.providers[index] = action.payload;
      }
      state.error = null;
    },
    removeProvider: (state, action: PayloadAction<string>) => {
      state.providers = state.providers.filter(p => p.id !== action.payload);
      state.selectedProviders = state.selectedProviders.filter(id => id !== action.payload);
      state.error = null;
    },
    setSelectedProviders: (state, action: PayloadAction<string[]>) => {
      state.selectedProviders = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearProviders: (state) => {
      state.providers = [];
      state.selectedProviders = [];
      state.error = null;
    },
  },
});

export const {
  setProviders,
  addProvider,
  updateProvider,
  removeProvider,
  setSelectedProviders,
  setLoading,
  setError,
  clearProviders,
} = providerSlice.actions;

export default providerSlice.reducer; 