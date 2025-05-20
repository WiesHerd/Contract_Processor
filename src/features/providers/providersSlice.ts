import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Provider } from '../../types/provider';
import { v4 as uuidv4 } from 'uuid';
import { RootState } from '../../store';
import { Template } from '../../types/template';

interface ProvidersState {
  providers: Provider[];
}

const initialState: ProvidersState = {
  providers: [],
};

const providersSlice = createSlice({
  name: 'providers',
  initialState,
  reducers: {
    addProvidersFromCSV: (state, action: PayloadAction<Omit<Provider, 'id' | 'lastModified'>[]>) => {
      const newProviders = action.payload.map(provider => ({
        ...provider,
        id: uuidv4(),
        lastModified: new Date().toISOString().split('T')[0],
      }));
      state.providers.push(...newProviders);
    },
    updateProvider: (state, action: PayloadAction<Provider>) => {
      const index = state.providers.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.providers[index] = {
          ...action.payload,
          lastModified: new Date().toISOString().split('T')[0],
        };
      }
    },
    deleteProvider: (state, action: PayloadAction<string>) => {
      state.providers = state.providers.filter(p => p.id !== action.payload);
    },
  },
});

// Selector to find the matched template for a provider
export const selectProviderWithMatchedTemplate = (providerId: string) => (state: RootState) => {
  const provider = state.providers.providers.find(p => p.id === providerId);
  if (!provider) return null;

  const templates = state.templates.templates;
  
  // First try to match by templateTag
  if (provider.templateTag) {
    const template = templates.find(t => t.name === provider.templateTag);
    if (template) return { provider, template };
  }

  // If no templateTag match, try to match by type based on provider data
  let contractModel: Template['type'] | undefined;
  
  if (provider.wRVUTarget && provider.conversionFactor) {
    contractModel = 'Productivity';
  } else if (provider.retentionBonus) {
    contractModel = 'Hybrid';
  } else {
    contractModel = 'Base';
  }

  const template = templates.find(t => t.type === contractModel);
  return { provider, template };
};

export const { addProvidersFromCSV, updateProvider, deleteProvider } = providersSlice.actions;
export default providersSlice.reducer; 