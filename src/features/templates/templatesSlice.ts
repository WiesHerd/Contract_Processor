import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Template } from '@/types/template';
import localforage from 'localforage';
import { listFiles, getTemplateMetadata, saveTemplateMetadata, deleteTemplate as deleteTemplateFromS3 } from '@/utils/s3Storage';
import { awsTemplates } from '@/utils/awsServices';

export interface TemplatesState {
  templates: Template[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastSync: string | null; // Add caching timestamp
}

const initialState: TemplatesState = {
  templates: [],
  status: 'idle',
  error: null,
  lastSync: null,
};

// Async thunk to hydrate templates from S3 with fallback to local storage
export const hydrateTemplatesFromS3 = createAsyncThunk(
  'templates/hydrateFromS3',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Starting template hydration from S3...');
      
      // First, try to find template folders in the templates/ path
      const templateFolders = await listFiles('templates/');
      console.log('📁 Template folders found:', templateFolders);
      
      const templates: Template[] = [];
      
      // Process each template folder
      for (const folderKey of templateFolders) {
        // Extract template ID from folder name (remove trailing slash)
        const templateId = folderKey.replace(/\/$/, '');
        
        if (templateId) {
          console.log(`🔍 Processing template folder: ${templateId}`);
          // Try to get template metadata from the metadata path
          const template = await getTemplateMetadata(templateId);
          
          if (template && template.id && template.id.trim() !== '' && template.name && template.name.trim() !== '') {
            console.log(`✅ Found valid template: ${template.name}`);
            templates.push(template);
          } else {
            console.warn('⚠️ Skipping invalid template:', template);
          }
        }
      }
      
      // If no templates found in folders, try the old metadata path as fallback
      if (templates.length === 0) {
        console.log('🔄 No templates found in folders, trying metadata path...');
        const templateKeys = await listFiles('metadata/templates/');
        console.log('📄 Template metadata files found:', templateKeys);
        
        for (const key of templateKeys) {
          const templateId = key.split('/').pop()?.replace('.json', '');
          if (templateId) {
            console.log(`🔍 Processing template metadata: ${templateId}`);
            const template = await getTemplateMetadata(templateId);
            if (template && template.id && template.id.trim() !== '' && template.name && template.name.trim() !== '') {
              console.log(`✅ Found valid template from metadata: ${template.name}`);
              templates.push(template);
            } else {
              console.warn('⚠️ Skipping invalid template from metadata:', template);
            }
          }
        }
      }
      
      // If still no templates, try GraphQL database as final fallback
      if (templates.length === 0) {
        console.log('🔄 No templates found in S3, trying GraphQL database...');
        try {
          const graphqlResult = await awsTemplates.list(1000);
          if (graphqlResult?.items && graphqlResult.items.length > 0) {
            console.log(`📊 Found ${graphqlResult.items.length} templates in GraphQL database`);
            const validTemplates = graphqlResult.items.filter((item): item is NonNullable<typeof item> => 
              item !== null && 
              item.id && 
              item.id.trim() !== '' && 
              item.name && 
              item.name.trim() !== ''
            );
            // Convert GraphQL Template to local Template format
            const convertedTemplates: Template[] = validTemplates.map(graphqlTemplate => ({
              id: graphqlTemplate.id,
              name: graphqlTemplate.name,
              description: graphqlTemplate.description || '',
              version: graphqlTemplate.version || '1.0.0',
              compensationModel: 'BASE' as const,
              content: '',
              metadata: {
                createdAt: graphqlTemplate.createdAt || new Date().toISOString(),
                updatedAt: graphqlTemplate.updatedAt || new Date().toISOString(),
                createdBy: graphqlTemplate.owner || 'system',
                lastModifiedBy: graphqlTemplate.owner || 'system',
              },
              placeholders: [],
              docxTemplate: graphqlTemplate.s3Key || '',
              clauseIds: [],
              tags: [],
              clauses: [],
              versionHistory: [],
            }));
            templates.push(...convertedTemplates);
            console.log(`✅ Added ${convertedTemplates.length} valid templates from GraphQL`);
          }
        } catch (graphqlError) {
          console.warn('⚠️ GraphQL fallback failed:', graphqlError);
        }
      }
      
      console.log(`🎉 Template hydration complete. Found ${templates.length} templates.`);
      return templates;
    } catch (error) {
      console.error('❌ S3 storage not available, falling back to local storage:', error);
      // Fallback to local storage when S3 is not available
      try {
        console.log('🔄 Attempting local storage fallback...');
        const localTemplates: Template[] = [];
        await localforage.iterate((value: Template, key) => {
          if (key.startsWith('template_')) {
            localTemplates.push(value);
          }
        });
        console.log(`📦 Found ${localTemplates.length} templates in local storage.`);
        return localTemplates;
      } catch (localError) {
        console.error('❌ Both S3 and local storage failed:', localError);
        return rejectWithValue('Failed to load templates from any storage');
      }
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

// Add a new thunk for conditional fetching with caching
export const fetchTemplatesIfNeeded = createAsyncThunk(
  'templates/fetchIfNeeded',
  async (_, { getState, dispatch }) => {
    const state = getState() as any;
    const { templates, lastSync, status } = state.templates;
    
    const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
    const now = new Date().getTime();
    const lastSyncTime = lastSync ? new Date(lastSync).getTime() : 0;
    
    // Fetch if:
    // 1. Status is idle (no data loaded yet)
    // 2. The data is stale (older than 5 minutes)
    // NOTE: Don't fetch just because templates.length === 0 (user may have deleted all)
    if (status === 'idle' || (now - lastSyncTime > CACHE_DURATION_MS)) {
      return dispatch(hydrateTemplatesFromS3());
    }
    
    // Return existing data if cache is still valid
    return { payload: templates };
  }
);

export const addTemplate = createAsyncThunk(
  'templates/addTemplate',
  async (template: Template, { dispatch, rejectWithValue }) => {
    try {
      // Validate template before saving
      if (!template.id || template.id.trim() === '' || !template.name || template.name.trim() === '') {
        return rejectWithValue('Template must have valid ID and name');
      }
      
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

// Delete all templates from S3/backend and then clear Redux state
export const deleteAllTemplates = createAsyncThunk(
  'templates/deleteAllTemplates',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { templates: TemplatesState };
      const templates = state.templates.templates;
      // Delete each template from S3/backend
      await Promise.all(
        templates.map(async (template) => {
          try {
            await deleteTemplateFromS3(template.id);
          } catch (err) {
            // Log and continue, but collect errors
            console.error(`Failed to delete template ${template.id}:`, err);
            throw err;
          }
        })
      );
      // After all deletes succeed, clear Redux state
      dispatch(templatesSlice.actions.clearTemplates());
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete all templates');
    }
  }
);

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    addTemplateSync: (state, action: PayloadAction<Template>) => {
      const template = action.payload;
      // Only add valid templates
      if (template && template.id && template.id.trim() !== '' && template.name && template.name.trim() !== '') {
        state.templates.push(template);
      } else {
        console.warn('Attempted to add invalid template to state:', template);
      }
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
      // Filter out invalid templates
      const validTemplates = action.payload.filter(template => 
        template && 
        template.id && 
        template.id.trim() !== '' && 
        template.name && 
        template.name.trim() !== ''
      );
      state.templates = validTemplates;
    },
    clearTemplates: (state) => {
      state.templates = [];
      state.lastSync = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateTemplates.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Filter out invalid templates
        const validTemplates = action.payload.filter(template => 
          template && 
          template.id && 
          template.id.trim() !== '' && 
          template.name && 
          template.name.trim() !== ''
        );
        state.templates = validTemplates;
        state.lastSync = new Date().toISOString();
      })
      .addCase(hydrateTemplatesFromS3.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(hydrateTemplatesFromS3.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Filter out invalid templates
        const validTemplates = action.payload.filter(template => 
          template && 
          template.id && 
          template.id.trim() !== '' && 
          template.name && 
          template.name.trim() !== ''
        );
        state.templates = validTemplates;
        state.lastSync = new Date().toISOString();
      })
      .addCase(hydrateTemplatesFromS3.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(fetchTemplatesIfNeeded.fulfilled, (state, action) => {
        // Only update if we actually fetched new data
        if (action.payload && Array.isArray(action.payload)) {
          // Filter out invalid templates
          const validTemplates = action.payload.filter(template => 
            template && 
            template.id && 
            template.id.trim() !== '' && 
            template.name && 
            template.name.trim() !== ''
          );
          state.templates = validTemplates;
          state.lastSync = new Date().toISOString();
        }
        state.status = 'succeeded';
      });
  },
});

export const { updateTemplate, setTemplates, clearTemplates, addTemplateSync, deleteTemplateSync } = templatesSlice.actions;

export default templatesSlice.reducer; 