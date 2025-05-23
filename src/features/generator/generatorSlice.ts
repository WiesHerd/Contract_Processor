import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Template } from '@/types/template';
import { Provider } from '@/types/provider';

export interface GeneratedFile {
  providerId: string;
  fileName: string;
  url: string;
}

interface GeneratorState {
  selectedTemplate: Template | null;
  selectedProvider: Provider | null;
  isGenerating: boolean;
  error: string | null;
  generatedFiles: GeneratedFile[];
}

const initialState: GeneratorState = {
  selectedTemplate: null,
  selectedProvider: null,
  isGenerating: false,
  error: null,
  generatedFiles: [],
};

const generatorSlice = createSlice({
  name: 'generator',
  initialState,
  reducers: {
    setSelectedTemplate: (state, action: PayloadAction<Template | null>) => {
      state.selectedTemplate = action.payload;
    },
    setSelectedProvider: (state, action: PayloadAction<Provider | null>) => {
      state.selectedProvider = action.payload;
    },
    setGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    addGeneratedFile: (state, action: PayloadAction<GeneratedFile>) => {
      state.generatedFiles.push(action.payload);
    },
    clearGeneratedFiles: (state) => {
      state.generatedFiles = [];
    },
  },
});

export const {
  setSelectedTemplate,
  setSelectedProvider,
  setGenerating,
  setError,
  addGeneratedFile,
  clearGeneratedFiles,
} = generatorSlice.actions;

export default generatorSlice.reducer; 