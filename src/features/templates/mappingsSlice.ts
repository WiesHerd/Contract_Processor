import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { awsMappings } from '@/utils/awsServices';
import { Mapping } from '@/API';

export interface FieldMapping {
  placeholder: string;
  mappedColumn?: string;
  notes?: string;
}

export interface TemplateMapping {
  templateId: string;
  mappings: FieldMapping[];
  lastModified: string;
}

interface MappingsState {
  mappings: Record<string, TemplateMapping>;
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
    const state = getState() as any;
    const { mappings, lastSync } = state.mappings;
    
    const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
    const now = new Date().getTime();
    const lastSyncTime = lastSync ? new Date(lastSync).getTime() : 0;
    
    // Fetch if:
    // 1. There are no mappings loaded
    // 2. The data is stale (older than 5 minutes)
    if (Object.keys(mappings).length === 0 || (now - lastSyncTime > CACHE_DURATION_MS)) {
      try {
        const result = await awsMappings.list();
        if (result?.items) {
          const allMappingItems = result.items.filter((item): item is Mapping => !!item);

          const groupedMappings = allMappingItems.reduce<Record<string, TemplateMapping>>((acc, item) => {
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
              mappedColumn: value ?? undefined,
            });
            
            if (updatedAt && new Date(updatedAt) > new Date(acc[templateID].lastModified)) {
              acc[templateID].lastModified = updatedAt;
            }

            return acc;
          }, {});

          return groupedMappings;
        }
        return {};
      } catch (error) {
        return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch mappings');
      }
    }
    
    // Return existing data if cache is still valid
    return mappings;
  }
);

const mappingsSlice = createSlice({
  name: 'mappings',
  initialState,
  reducers: {
    setMapping: (state, action: PayloadAction<{ templateId: string; mapping: TemplateMapping }>) => {
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
    loadMappings: (state, action: PayloadAction<Record<string, TemplateMapping>>) => {
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