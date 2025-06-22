import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { awsAuditLogs } from '@/utils/awsServices';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user?: string;
  providers: string[];
  template: string;
  outputType: string;
  status: 'success' | 'failed' | 'skipped';
  downloadUrl?: string;
}

interface AuditState {
  logs: AuditLogEntry[];
  lastSync: string | null; // Add caching timestamp
  loading: boolean;
  error: string | null;
}

const initialState: AuditState = {
  logs: [],
  lastSync: null,
  loading: false,
  error: null,
};

// Async thunk to fetch audit logs with caching
export const fetchAuditLogsIfNeeded = createAsyncThunk(
  'audit/fetchIfNeeded',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as any;
    const { logs, lastSync } = state.audit;
    
    const CACHE_DURATION_MS = 2 * 60 * 1000; // 2 minutes (audit logs change more frequently)
    const now = new Date().getTime();
    const lastSyncTime = lastSync ? new Date(lastSync).getTime() : 0;
    
    // Fetch if:
    // 1. There are no logs loaded
    // 2. The data is stale (older than 2 minutes)
    if (logs.length === 0 || (now - lastSyncTime > CACHE_DURATION_MS)) {
      try {
        const result = await awsAuditLogs.list();
        if (result?.items) {
          // Transform API audit logs to our internal format
          return result.items
            .filter((item): item is any => item !== null)
            .map(item => ({
              id: item.id,
              timestamp: item.timestamp,
              user: item.user || 'system',
              providers: [], // API doesn't have this field, would need to be added
              template: item.action || 'unknown',
              outputType: 'audit_log',
              status: 'success' as const, // Default status
              downloadUrl: undefined,
            }));
        }
        return [];
      } catch (error) {
        return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch audit logs');
      }
    }
    
    // Return existing data if cache is still valid
    return logs;
  }
);

const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {
    addAuditLog: (state, action: PayloadAction<AuditLogEntry>) => {
      state.logs.unshift(action.payload);
    },
    clearAuditLogs: (state) => {
      state.logs = [];
      state.lastSync = null;
    },
    setAuditLogs: (state, action: PayloadAction<AuditLogEntry[]>) => {
      state.logs = action.payload;
      state.lastSync = new Date().toISOString();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLogsIfNeeded.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogsIfNeeded.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload;
        state.lastSync = new Date().toISOString();
      })
      .addCase(fetchAuditLogsIfNeeded.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { addAuditLog, clearAuditLogs, setAuditLogs } = auditSlice.actions;
export default auditSlice.reducer; 