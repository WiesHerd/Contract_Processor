import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Template } from '@/types/template';
import { Provider } from '@/types/provider';
import { ContractGenerationLog } from '@/services/contractGenerationLogService';

export interface GeneratedFile {
  providerId: string;
  fileName: string;
  url: string;
}

export interface GeneratedContract {
  providerId: string;
  templateId: string;
  status: 'SUCCESS' | 'FAILED';
  generatedAt: string;
  fileUrl?: string;
  fileName?: string;
  s3Key?: string;
  error?: string;
}

interface GeneratorState {
  selectedTemplate: Template | null;
  selectedProvider: Provider | null;
  isGenerating: boolean;
  error: string | null;
  generatedFiles: GeneratedFile[];
  generationLogs: ContractGenerationLog[];
  logsLoading: boolean;
  logsError: string | null;
  generatedContracts: GeneratedContract[];
}

const initialState: GeneratorState = {
  selectedTemplate: null,
  selectedProvider: null,
  isGenerating: false,
  error: null,
  generatedFiles: [],
  generationLogs: [],
  logsLoading: false,
  logsError: null,
  generatedContracts: [],
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
    setGenerationLogs: (state, action: PayloadAction<ContractGenerationLog[]>) => {
      state.generationLogs = action.payload;
    },
    setLogsLoading: (state, action: PayloadAction<boolean>) => {
      state.logsLoading = action.payload;
    },
    setLogsError: (state, action: PayloadAction<string | null>) => {
      state.logsError = action.payload;
    },
    addGenerationLog: (state, action: PayloadAction<ContractGenerationLog>) => {
      state.generationLogs.unshift(action.payload);
    },
    addGeneratedContract: (state, action: PayloadAction<GeneratedContract>) => {
      state.generatedContracts = state.generatedContracts.filter(
        c => !(c.providerId === action.payload.providerId && c.templateId === action.payload.templateId)
      );
      state.generatedContracts.push(action.payload);
    },
    clearGeneratedContracts: (state) => {
      state.generatedContracts = [];
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
  setGenerationLogs,
  setLogsLoading,
  setLogsError,
  addGenerationLog,
  addGeneratedContract,
  clearGeneratedContracts,
} = generatorSlice.actions;

export default generatorSlice.reducer; 