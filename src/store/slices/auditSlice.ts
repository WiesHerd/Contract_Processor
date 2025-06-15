import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
}

const initialState: AuditState = {
  logs: [],
};

const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {
    addAuditLog: (state, action: PayloadAction<AuditLogEntry>) => {
      state.logs.unshift(action.payload);
    },
    clearAuditLogs: (state) => {
      state.logs = [];
    },
  },
});

export const { addAuditLog, clearAuditLogs } = auditSlice.actions;
export default auditSlice.reducer; 