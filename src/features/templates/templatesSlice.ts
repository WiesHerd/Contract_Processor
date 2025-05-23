import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Template } from '@/types/template';
import localforage from 'localforage';

interface TemplatesState {
  templates: Template[];
  selectedTemplate: Template | null;
  loading: boolean;
  error: string | null;
}

const initialState: TemplatesState = {
  templates: [],
  selectedTemplate: null,
  loading: false,
  error: null,
};

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    setTemplates: (state, action: PayloadAction<Template[]>) => {
      state.templates = action.payload;
    },
    clearTemplates: (state) => {
      state.templates = [];
      state.selectedTemplate = null;
    },
    addTemplate: (state, action: PayloadAction<Template>) => {
      state.templates.push(action.payload);
    },
    updateTemplate: (state, action: PayloadAction<Template>) => {
      const index = state.templates.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.templates[index] = action.payload;
      }
    },
    deleteTemplate: (state, action: PayloadAction<string>) => {
      state.templates = state.templates.filter(t => t.id !== action.payload);
    },
    setSelectedTemplate: (state, action: PayloadAction<Template | null>) => {
      state.selectedTemplate = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

// Thunk for hydrating templates from redux-persist (no longer from localforage)
export const hydrateTemplates = createAsyncThunk(
  'templates/hydrate',
  async () => {
    // No-op: redux-persist will rehydrate automatically
    // Optionally, you can trigger any post-hydration logic here
    return;
  }
);

export const {
  setTemplates,
  clearTemplates,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  setSelectedTemplate,
  setLoading,
  setError,
} = templatesSlice.actions;

export default templatesSlice.reducer; 