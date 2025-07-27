import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Clause } from '@/types/clause';
import { awsClauses } from '@/utils/awsServices';
import { CLAUSES as SHARED_CLAUSES } from '@/features/clauses/clausesData';
import { Clause as APIClause } from '@/API';

interface ClauseState {
  clauses: Clause[];
  loading: boolean;
  error: string | null;
  lastSync: string | null; // Add caching timestamp
}

const initialState: ClauseState = {
  clauses: [],
  loading: false,
  error: null,
  lastSync: null,
};

// Transform API Clause to internal Clause type
const transformAPIClauseToClause = (apiClause: APIClause): Clause => {
  return {
    id: apiClause.id,
    title: apiClause.title || apiClause.text.substring(0, 100),
    content: apiClause.text,
    type: 'standard',
    category: 'other', // or your category logic
    tags: apiClause.tags?.filter((tag): tag is string => tag !== null) || [],
    applicableProviderTypes: ['physician'],
    applicableCompensationModels: ['base'],
    createdAt: apiClause.createdAt,
    updatedAt: apiClause.updatedAt,
    version: '1.0.0',
    conditions: apiClause.condition ? [{
      field: 'condition',
      operator: 'exists',
      value: apiClause.condition
    }] : undefined
  };
};

// Helper function to check if item is a valid API Clause
const isValidAPIClause = (item: any): item is APIClause => {
  return item !== null && 
         typeof item === 'object' && 
         typeof item.id === 'string' && 
         typeof item.text === 'string';
};

// Async thunk to fetch clauses with caching and fallback
export const fetchClausesIfNeeded = createAsyncThunk(
  'clauses/fetchIfNeeded',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as any;
    const { clauses, lastSync } = state.clauses;
    
    const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
    const now = new Date().getTime();
    const lastSyncTime = lastSync ? new Date(lastSync).getTime() : 0;
    
    // Always fetch if no clauses loaded or cache is stale
    if (clauses.length === 0 || (now - lastSyncTime > CACHE_DURATION_MS)) {
      try {
        const items = await awsClauses.listAll();
        const validClauses = items.filter(isValidAPIClause);
        const transformedClauses = validClauses.map(transformAPIClauseToClause);
        if (transformedClauses.length > 0) {
          return transformedClauses;
        } else {
          // If DynamoDB is empty, use the static clauses as fallback
          return SHARED_CLAUSES;
        }
      } catch (error) {
        console.error('Error fetching clauses from DynamoDB, using static fallback:', error);
        // If API fails, use the static clauses as fallback
        return SHARED_CLAUSES;
      }
    }
    
    // Return existing data if cache is still valid
    return clauses;
  }
);

const clauseSlice = createSlice({
  name: 'clauses',
  initialState,
  reducers: {
    setClauses: (state, action: PayloadAction<Clause[]>) => {
      state.clauses = action.payload;
      state.lastSync = new Date().toISOString();
    },
    addClause: (state, action: PayloadAction<Clause>) => {
      state.clauses.push(action.payload);
    },
    updateClause: (state, action: PayloadAction<Clause>) => {
      const index = state.clauses.findIndex(clause => clause.id === action.payload.id);
      if (index !== -1) {
        state.clauses[index] = action.payload;
      }
    },
    deleteClause: (state, action: PayloadAction<string>) => {
      state.clauses = state.clauses.filter(clause => clause.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearClauses: (state) => {
      state.clauses = [];
      state.lastSync = null;
    },
    // Add action to load static clauses as fallback
    loadStaticClauses: (state) => {
      state.clauses = SHARED_CLAUSES;
      state.lastSync = new Date().toISOString();
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClausesIfNeeded.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClausesIfNeeded.fulfilled, (state, action) => {
        state.loading = false;
        state.clauses = action.payload;
        state.lastSync = new Date().toISOString();
      })
      .addCase(fetchClausesIfNeeded.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        // If fetch fails, load static clauses as fallback
        state.clauses = SHARED_CLAUSES;
        state.lastSync = new Date().toISOString();
      });
  },
});

export const { setClauses, addClause, updateClause, deleteClause, setLoading, setError, clearClauses, loadStaticClauses } = clauseSlice.actions;

export default clauseSlice.reducer; 