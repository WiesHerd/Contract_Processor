import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Template, TemplateState } from '../../types/template';

const initialState: TemplateState = {
  templates: [],
  selectedTemplate: null,
  loading: false,
  error: null,
};

const templateSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    setTemplates: (state, action: PayloadAction<Template[]>) => {
      state.templates = action.payload;
      state.error = null;
    },
    addTemplate: (state, action: PayloadAction<Template>) => {
      state.templates.push(action.payload);
      state.error = null;
    },
    updateTemplate: (state, action: PayloadAction<Template>) => {
      const index = state.templates.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.templates[index] = action.payload;
      }
      state.error = null;
    },
    removeTemplate: (state, action: PayloadAction<string>) => {
      state.templates = state.templates.filter(t => t.id !== action.payload);
      if (state.selectedTemplate === action.payload) {
        state.selectedTemplate = null;
      }
      state.error = null;
    },
    setSelectedTemplate: (state, action: PayloadAction<string | null>) => {
      state.selectedTemplate = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearTemplates: (state) => {
      state.templates = [];
      state.selectedTemplate = null;
      state.error = null;
    },
  },
});

export const {
  setTemplates,
  addTemplate,
  updateTemplate,
  removeTemplate,
  setSelectedTemplate,
  setLoading,
  setError,
  clearTemplates,
} = templateSlice.actions;

export default templateSlice.reducer; 