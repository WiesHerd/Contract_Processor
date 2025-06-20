import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Template } from '@/types/template';
import localforage from 'localforage';
import { listFiles, getTemplateMetadata, saveTemplateMetadata, deleteTemplate as deleteTemplateFromS3 } from '@/utils/s3Storage';

export interface TemplatesState {
  templates: Template[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: TemplatesState = {
  templates: [],
  status: 'idle',
  error: null,
};

// Async thunk to hydrate templates from S3
export const hydrateTemplatesFromS3 = createAsyncThunk(
  'templates/hydrateFromS3',
  async (_, { rejectWithValue }) => {
    try {
      const templateKeys = await listFiles('metadata/templates/');
      const templates: Template[] = [];
      for (const key of templateKeys) {
        const templateId = key.split('/').pop()?.replace('.json', '');
        if (templateId) {
          const template = await getTemplateMetadata(templateId);
          if (template) {
            templates.push(template);
          }
        }
      }
      return templates;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to hydrate templates from S3');
    }
  }
);

export const hydrateTemplates = createAsyncThunk(
  'templates/hydrateTemplates', 
  async () => {
    const templates: Template[] = [];
    await localforage.iterate((value: Template, key) => {
        if (key.startsWith('template_')) {
            templates.push(value);
        }
    });
    return templates;
});

export const addTemplate = createAsyncThunk(
  'templates/addTemplate',
  async (template: Template, { dispatch, rejectWithValue }) => {
    try {
      await saveTemplateMetadata(template);
      dispatch(templatesSlice.actions.addTemplateSync(template));
      return template;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save template metadata to S3');
    }
  }
);

export const deleteTemplate = createAsyncThunk(
  'templates/deleteTemplate',
  async (templateId: string, { dispatch, rejectWithValue }) => {
    try {
      await deleteTemplateFromS3(templateId);
      dispatch(templatesSlice.actions.deleteTemplateSync(templateId));
      return templateId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete template from S3');
    }
  }
);

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    addTemplateSync: (state, action: PayloadAction<Template>) => {
      state.templates.push(action.payload);
    },
    updateTemplate: (state, action: PayloadAction<Template>) => {
      const index = state.templates.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.templates[index] = action.payload;
      }
    },
    deleteTemplateSync: (state, action: PayloadAction<string>) => {
      state.templates = state.templates.filter(t => t.id !== action.payload);
    },
    setTemplates: (state, action: PayloadAction<Template[]>) => {
      state.templates = action.payload;
    },
    clearTemplates: (state) => {
      state.templates = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateTemplates.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.templates = action.payload;
      })
      .addCase(hydrateTemplatesFromS3.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(hydrateTemplatesFromS3.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.templates = action.payload;
      })
      .addCase(hydrateTemplatesFromS3.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { updateTemplate, setTemplates, clearTemplates } = templatesSlice.actions;

export default templatesSlice.reducer; 