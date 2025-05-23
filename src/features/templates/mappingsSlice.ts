import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
}

const initialState: MappingsState = {
  mappings: {},
};

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
    },
  },
});

export const { setMapping, updateMapping, deleteMapping, loadMappings } = mappingsSlice.actions;
export default mappingsSlice.reducer; 