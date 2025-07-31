import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DynamicBlockService, DynamicBlockResponse } from '@/services/dynamicBlockService';
import { RootState } from '../index';

// Selectors
export const selectDynamicBlocks = (state: RootState) => state.dynamicBlocks.blocks;
export const selectDynamicBlocksLoading = (state: RootState) => state.dynamicBlocks.loading;
export const selectDynamicBlocksError = (state: RootState) => state.dynamicBlocks.error;

// Smart caching thunk for dynamic blocks - Enterprise-grade
export const fetchDynamicBlocksIfNeeded = createAsyncThunk(
  'dynamicBlocks/fetchIfNeeded',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as any;
    const { blocks, lastSync, loading } = state.dynamicBlocks;
    
    const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes cache
    const now = new Date().getTime();
    const lastSyncTime = lastSync ? new Date(lastSync).getTime() : 0;
    const isCacheValid = (now - lastSyncTime < CACHE_DURATION_MS);
    
    console.log('🔍 Dynamic Blocks Cache Check:', {
      blocksCount: blocks.length,
      isCacheValid,
      timeSinceLastSync: now - lastSyncTime,
      cacheDuration: CACHE_DURATION_MS
    });
    
    // Return cached data if valid
    if (blocks.length > 0 && isCacheValid) {
      console.log('✅ Using cached dynamic blocks data');
      return blocks;
    }
    
    // Fetch fresh data if cache is invalid or empty
    console.log('🔄 Fetching fresh dynamic blocks data');
    try {
      const blocks = await DynamicBlockService.listDynamicBlocks();
      return blocks;
    } catch (error) {
      console.error('Error fetching dynamic blocks:', error);
      return rejectWithValue(error);
    }
  }
);

// Async thunks for CRUD operations
export const createDynamicBlock = createAsyncThunk(
  'dynamicBlocks/create',
  async (blockData: any, { rejectWithValue }) => {
    try {
      const block = await DynamicBlockService.createDynamicBlock(blockData);
      return block;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const updateDynamicBlock = createAsyncThunk(
  'dynamicBlocks/update',
  async (blockData: any, { rejectWithValue }) => {
    try {
      const block = await DynamicBlockService.updateDynamicBlock(blockData);
      return block;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const deleteDynamicBlock = createAsyncThunk(
  'dynamicBlocks/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await DynamicBlockService.deleteDynamicBlock(id);
      return id;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

interface DynamicBlocksState {
  blocks: DynamicBlockResponse[];
  lastSync: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: DynamicBlocksState = {
  blocks: [],
  lastSync: null,
  loading: false,
  error: null,
};

const dynamicBlockSlice = createSlice({
  name: 'dynamicBlocks',
  initialState,
  reducers: {
    clearDynamicBlocks: (state) => {
      state.blocks = [];
      state.lastSync = null;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch Dynamic Blocks If Needed
    builder.addCase(fetchDynamicBlocksIfNeeded.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchDynamicBlocksIfNeeded.fulfilled, (state, action) => {
      state.loading = false;
      state.blocks = action.payload;
      state.lastSync = new Date().toISOString();
    });
    builder.addCase(fetchDynamicBlocksIfNeeded.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create Dynamic Block
    builder.addCase(createDynamicBlock.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createDynamicBlock.fulfilled, (state, action) => {
      state.loading = false;
      state.blocks.push(action.payload);
      state.lastSync = new Date().toISOString();
    });
    builder.addCase(createDynamicBlock.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Update Dynamic Block
    builder.addCase(updateDynamicBlock.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateDynamicBlock.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.blocks.findIndex(block => block.id === action.payload.id);
      if (index !== -1) {
        state.blocks[index] = action.payload;
      }
      state.lastSync = new Date().toISOString();
    });
    builder.addCase(updateDynamicBlock.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Delete Dynamic Block
    builder.addCase(deleteDynamicBlock.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteDynamicBlock.fulfilled, (state, action) => {
      state.loading = false;
      state.blocks = state.blocks.filter(block => block.id !== action.payload);
      state.lastSync = new Date().toISOString();
    });
    builder.addCase(deleteDynamicBlock.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearDynamicBlocks, setError } = dynamicBlockSlice.actions;
export default dynamicBlockSlice.reducer; 