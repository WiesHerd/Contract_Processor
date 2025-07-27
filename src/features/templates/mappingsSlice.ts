import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { awsMappings, awsTemplateMappings } from '@/utils/awsServices';
import { Mapping, TemplateMapping } from '@/API';

export interface FieldMapping {
  placeholder: string;
  mappedColumn?: string;
  notes?: string;
}

export interface LocalTemplateMapping {
  templateId: string;
  mappings: FieldMapping[];
  lastModified: string;
}

interface MappingsState {
  mappings: Record<string, LocalTemplateMapping>;
  lastSync: string | null; // Add caching timestamp
  loading: boolean;
  error: string | null;
}

const initialState: MappingsState = {
  mappings: {},
  lastSync: null,
  loading: false,
  error: null,
};

// Async thunk to fetch mappings with caching
export const fetchMappingsIfNeeded = createAsyncThunk(
  'mappings/fetchIfNeeded',
  async (_, { getState, rejectWithValue }) => {
    // Always fetch from backend for freshest data
    try {
      const result = await awsTemplateMappings.list();
      if (result?.items) {
        const allMappingItems = result.items.filter((item): item is TemplateMapping => !!item);

        const groupedMappings = allMappingItems.reduce<Record<string, LocalTemplateMapping>>((acc, item) => {
          const { templateID, field, value, updatedAt } = item;
          if (!templateID) return acc;

          if (!acc[templateID]) {
            acc[templateID] = {
              templateId: templateID,
              mappings: [],
              lastModified: updatedAt || new Date().toISOString(),
            };
          }

          acc[templateID].mappings.push({
            placeholder: field,
            mappedColumn: value || undefined,
          });

          return acc;
        }, {});

        return groupedMappings;
      }
      return {};
    } catch (error) {
      console.error('Error fetching template mappings:', error);
      return rejectWithValue(error);
    }
  }
);

const mappingsSlice = createSlice({
  name: 'mappings',
  initialState,
  reducers: {
    setMapping: (state, action: PayloadAction<{ templateId: string; mapping: LocalTemplateMapping }>) => {
      state.mappings[action.payload.templateId] = action.payload.mapping;
    },
    updateMapping: (state, action: PayloadAction<{ templateId: string; mappings: FieldMapping[] }>) => {
      if (state.mappings[action.payload.templateId]) {
        state.mappings[action.payload.templateId] = {
          ...state.mappings[action.payload.templateId],
          mappings: action.payload.mappings,
          lastModified: new Date().toISOString(),
        };
      }
    },
    deleteMapping: (state, action: PayloadAction<string>) => {
      delete state.mappings[action.payload];
    },
    loadMappings: (state, action: PayloadAction<Record<string, LocalTemplateMapping>>) => {
      state.mappings = action.payload;
      state.lastSync = new Date().toISOString();
    },
    clearMappings: (state) => {
      state.mappings = {};
      state.lastSync = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMappingsIfNeeded.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMappingsIfNeeded.fulfilled, (state, action) => {
        state.loading = false;
        state.mappings = action.payload;
        state.lastSync = new Date().toISOString();
      })
      .addCase(fetchMappingsIfNeeded.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setMapping, updateMapping, deleteMapping, loadMappings, clearMappings } = mappingsSlice.actions;
export default mappingsSlice.reducer; 