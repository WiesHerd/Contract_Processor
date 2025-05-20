import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Template } from '@/types/template';

interface TemplatesState {
  templates: Template[];
}

const initialState: TemplatesState = {
  templates: [
    {
      id: '1',
      name: 'Standard Base Contract',
      version: '2024.1',
      type: 'Base',
      lastModified: '2024-03-15',
      placeholders: ['ProviderName', 'StartDate', 'BaseSalary', 'FTE'],
      clauseIds: ['standard_terms', 'confidentiality'],
      docxTemplate: 'base_contract_2024.docx',
    },
    {
      id: '2',
      name: 'Productivity Model A',
      version: '2024.1',
      type: 'Productivity',
      lastModified: '2024-03-14',
      placeholders: ['ProviderName', 'StartDate', 'BaseSalary', 'wRVUTarget', 'ConversionFactor'],
      clauseIds: ['productivity_terms', 'bonus_schedule'],
      docxTemplate: 'productivity_contract_2024.docx',
    },
    {
      id: '3',
      name: 'Hospital-based Specialist',
      version: '2024.1',
      type: 'Hospital-based',
      lastModified: '2024-03-13',
      placeholders: ['ProviderName', 'StartDate', 'BaseSalary', 'Department', 'CallSchedule'],
      clauseIds: ['hospital_terms', 'call_coverage'],
      docxTemplate: 'hospital_contract_2024.docx',
    },
  ],
};

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
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
  },
});

export const { addTemplate, updateTemplate, deleteTemplate } = templatesSlice.actions;
export default templatesSlice.reducer; 