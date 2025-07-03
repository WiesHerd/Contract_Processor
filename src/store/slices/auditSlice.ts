import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { generateClient } from 'aws-amplify/api';
import { createAuditLog } from '../../graphql/mutations';
import { listAuditLogs } from '../../graphql/queries';
import { CreateAuditLogInput, AuditLog, ModelAuditLogFilterInput } from '../../API';

const client = generateClient();

// Enhanced audit log entry that extends the basic GraphQL schema
export interface AuditLogEntry extends AuditLog {
  // Additional fields for enterprise security
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: 'AUTH' | 'DATA' | 'ADMIN' | 'SECURITY' | 'SYSTEM';
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

interface AuditState {
  logs: AuditLogEntry[];
  isLoading: boolean;
  error: string | null;
  filters: {
    category?: string;
    severity?: string;
    dateRange?: { start: string; end: string };
    userId?: string;
  };
}

const initialState: AuditState = {
  logs: [],
  isLoading: false,
  error: null,
  filters: {},
};

// Enhanced audit logging with security events
export const logSecurityEvent = createAsyncThunk(
  'audit/logSecurityEvent',
  async (payload: {
    action: string;
    details: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category?: 'AUTH' | 'DATA' | 'ADMIN' | 'SECURITY' | 'SYSTEM';
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, any>;
  }) => {
    const { action, details, severity, category, resourceType, resourceId, metadata } = payload;
    
    // Get user info from localStorage or context
    const userEmail = localStorage.getItem('userEmail') || 'unknown';
    const userId = localStorage.getItem('userId') || 'unknown';
    
    // Get client info
    const ipAddress = 'client-ip'; // In production, get from request headers
    const userAgent = navigator.userAgent;
    
    // Create audit log input compatible with current GraphQL schema
    const auditLogInput: CreateAuditLogInput = {
      action,
      user: userEmail,
      timestamp: new Date().toISOString(),
      details: JSON.stringify({
        originalDetails: details,
        severity,
        category,
        resourceType,
        resourceId,
        ipAddress,
        userAgent,
        metadata,
        userId,
      }),
    };

    try {
      const result = await client.graphql({
        query: createAuditLog,
        variables: { input: auditLogInput },
      });
      
      // Transform the result to include our enhanced fields
      const createdLog = result.data.createAuditLog;
      if (createdLog) {
        const parsedDetails = JSON.parse(createdLog.details || '{}');
        return {
          ...createdLog,
          severity: parsedDetails.severity || 'LOW',
          category: parsedDetails.category || 'SYSTEM',
          resourceType: parsedDetails.resourceType,
          resourceId: parsedDetails.resourceId,
          ipAddress: parsedDetails.ipAddress,
          userAgent: parsedDetails.userAgent,
          metadata: parsedDetails.metadata,
        } as AuditLogEntry;
      }
      return null;
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - audit logging should not break the app
      return null;
    }
  }
);

// Log authentication events
export const logAuthEvent = createAsyncThunk(
  'audit/logAuthEvent',
  async (payload: {
    action: 'SIGN_IN' | 'SIGN_OUT' | 'SIGN_UP' | 'PASSWORD_RESET' | 'MFA_SETUP' | 'MFA_VERIFY' | 'FAILED_LOGIN' | 'ACCOUNT_LOCKED';
    details: string;
    success: boolean;
    metadata?: Record<string, any>;
  }) => {
    const { action, details, success, metadata } = payload;
    
    const severity = success ? 'LOW' : 'HIGH';
    const category = 'AUTH';
    
    // Get user info from localStorage or context
    const userEmail = localStorage.getItem('userEmail') || 'unknown';
    const userId = localStorage.getItem('userId') || 'unknown';
    
    // Get client info
    const ipAddress = 'client-ip'; // In production, get from request headers
    const userAgent = navigator.userAgent;
    
    // Create audit log input compatible with current GraphQL schema
    const auditLogInput: CreateAuditLogInput = {
      action,
      user: userEmail,
      timestamp: new Date().toISOString(),
      details: JSON.stringify({
        originalDetails: details,
        severity,
        category,
        ipAddress,
        userAgent,
        metadata: {
          ...metadata,
          success,
          timestamp: new Date().toISOString(),
        },
        userId,
      }),
    };

    try {
      const result = await client.graphql({
        query: createAuditLog,
        variables: { input: auditLogInput },
      });
      
      // Transform the result to include our enhanced fields
      const createdLog = result.data.createAuditLog;
      if (createdLog) {
        const parsedDetails = JSON.parse(createdLog.details || '{}');
        return {
          ...createdLog,
          severity: parsedDetails.severity || 'LOW',
          category: parsedDetails.category || 'SYSTEM',
          resourceType: parsedDetails.resourceType,
          resourceId: parsedDetails.resourceId,
          ipAddress: parsedDetails.ipAddress,
          userAgent: parsedDetails.userAgent,
          metadata: parsedDetails.metadata,
        } as AuditLogEntry;
      }
      return null;
    } catch (error) {
      console.error('Failed to log auth event:', error);
      // Don't throw - audit logging should not break the app
      return null;
    }
  }
);

// Log admin actions
export const logAdminEvent = createAsyncThunk(
  'audit/logAdminEvent',
  async (payload: {
    action: string;
    details: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, any>;
  }) => {
    const { action, details, resourceType, resourceId, metadata } = payload;
    
    // Get user info from localStorage or context
    const userEmail = localStorage.getItem('userEmail') || 'unknown';
    const userId = localStorage.getItem('userId') || 'unknown';
    
    // Get client info
    const ipAddress = 'client-ip'; // In production, get from request headers
    const userAgent = navigator.userAgent;
    
    // Create audit log input compatible with current GraphQL schema
    const auditLogInput: CreateAuditLogInput = {
      action,
      user: userEmail,
      timestamp: new Date().toISOString(),
      details: JSON.stringify({
        originalDetails: details,
        severity: 'HIGH',
        category: 'ADMIN',
        resourceType,
        resourceId,
        ipAddress,
        userAgent,
        metadata,
        userId,
      }),
    };

    try {
      const result = await client.graphql({
        query: createAuditLog,
        variables: { input: auditLogInput },
      });
      
      // Transform the result to include our enhanced fields
      const createdLog = result.data.createAuditLog;
      if (createdLog) {
        const parsedDetails = JSON.parse(createdLog.details || '{}');
        return {
          ...createdLog,
          severity: parsedDetails.severity || 'LOW',
          category: parsedDetails.category || 'SYSTEM',
          resourceType: parsedDetails.resourceType,
          resourceId: parsedDetails.resourceId,
          ipAddress: parsedDetails.ipAddress,
          userAgent: parsedDetails.userAgent,
          metadata: parsedDetails.metadata,
        } as AuditLogEntry;
      }
      return null;
    } catch (error) {
      console.error('Failed to log admin event:', error);
      // Don't throw - audit logging should not break the app
      return null;
    }
  }
);

// Log data access events
export const logDataEvent = createAsyncThunk(
  'audit/logDataEvent',
  async (payload: {
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'BULK_OPERATION';
    resourceType: string;
    resourceId?: string;
    details: string;
    metadata?: Record<string, any>;
  }) => {
    const { action, resourceType, resourceId, details, metadata } = payload;
    
    const severity = action === 'DELETE' || action === 'BULK_OPERATION' ? 'HIGH' : 'MEDIUM';
    const category = 'DATA';
    
    // Get user info from localStorage or context
    const userEmail = localStorage.getItem('userEmail') || 'unknown';
    const userId = localStorage.getItem('userId') || 'unknown';
    
    // Get client info
    const ipAddress = 'client-ip'; // In production, get from request headers
    const userAgent = navigator.userAgent;
    
    // Create audit log input compatible with current GraphQL schema
    const auditLogInput: CreateAuditLogInput = {
      action,
      user: userEmail,
      timestamp: new Date().toISOString(),
      details: JSON.stringify({
        originalDetails: details,
        severity,
        category,
        resourceType,
        resourceId,
        ipAddress,
        userAgent,
        metadata,
        userId,
      }),
    };

    try {
      const result = await client.graphql({
        query: createAuditLog,
        variables: { input: auditLogInput },
      });
      
      // Transform the result to include our enhanced fields
      const createdLog = result.data.createAuditLog;
      if (createdLog) {
        const parsedDetails = JSON.parse(createdLog.details || '{}');
        return {
          ...createdLog,
          severity: parsedDetails.severity || 'LOW',
          category: parsedDetails.category || 'SYSTEM',
          resourceType: parsedDetails.resourceType,
          resourceId: parsedDetails.resourceId,
          ipAddress: parsedDetails.ipAddress,
          userAgent: parsedDetails.userAgent,
          metadata: parsedDetails.metadata,
        } as AuditLogEntry;
      }
      return null;
    } catch (error) {
      console.error('Failed to log data event:', error);
      // Don't throw - audit logging should not break the app
      return null;
    }
  }
);

// Log FMV override events (existing functionality enhanced)
export const logFMVOverride = createAsyncThunk(
  'audit/logFMVOverride',
  async (payload: {
    providerId: string;
    providerName: string;
    originalValue: number;
    overrideValue: number;
    justification: string;
    approverId?: string;
  }) => {
    const { providerId, providerName, originalValue, overrideValue, justification, approverId } = payload;
    
    // Get user info from localStorage or context
    const userEmail = localStorage.getItem('userEmail') || 'unknown';
    const userId = localStorage.getItem('userId') || 'unknown';
    
    // Get client info
    const ipAddress = 'client-ip'; // In production, get from request headers
    const userAgent = navigator.userAgent;
    
    // Create audit log input compatible with current GraphQL schema
    const auditLogInput: CreateAuditLogInput = {
      action: 'FMV_OVERRIDE',
      user: userEmail,
      timestamp: new Date().toISOString(),
      details: JSON.stringify({
        originalDetails: `FMV override for ${providerName}: ${originalValue} → ${overrideValue}`,
        severity: 'HIGH',
        category: 'SECURITY',
        resourceType: 'PROVIDER',
        resourceId: providerId,
        ipAddress,
        userAgent,
        metadata: {
          originalValue,
          overrideValue,
          justification,
          approverId,
          percentageChange: ((overrideValue - originalValue) / originalValue) * 100,
        },
        userId,
      }),
    };

    try {
      const result = await client.graphql({
        query: createAuditLog,
        variables: { input: auditLogInput },
      });
      
      // Transform the result to include our enhanced fields
      const createdLog = result.data.createAuditLog;
      if (createdLog) {
        const parsedDetails = JSON.parse(createdLog.details || '{}');
        return {
          ...createdLog,
          severity: parsedDetails.severity || 'LOW',
          category: parsedDetails.category || 'SYSTEM',
          resourceType: parsedDetails.resourceType,
          resourceId: parsedDetails.resourceId,
          ipAddress: parsedDetails.ipAddress,
          userAgent: parsedDetails.userAgent,
          metadata: parsedDetails.metadata,
        } as AuditLogEntry;
      }
      return null;
    } catch (error) {
      console.error('Failed to log FMV override:', error);
      // Don't throw - audit logging should not break the app
      return null;
    }
  }
);

export const fetchAuditLogs = createAsyncThunk(
  'audit/fetchAuditLogs',
  async (filters?: AuditState['filters']) => {
    try {
      // Convert our filters to GraphQL filter format
      const graphqlFilter: ModelAuditLogFilterInput = {};
      
      if (filters?.userId) {
        graphqlFilter.user = { eq: filters.userId };
      }
      
      const result = await client.graphql({
        query: listAuditLogs,
        variables: { 
          filter: graphqlFilter,
          limit: 1000,
        },
      });
      
      // Transform the results to include our enhanced fields
      const items = result.data.listAuditLogs?.items || [];
      return items.map((item: any) => {
        if (!item) return null;
        
        try {
          const parsedDetails = JSON.parse(item.details || '{}');
          return {
            ...item,
            severity: parsedDetails.severity || 'LOW',
            category: parsedDetails.category || 'SYSTEM',
            resourceType: parsedDetails.resourceType,
            resourceId: parsedDetails.resourceId,
            ipAddress: parsedDetails.ipAddress,
            userAgent: parsedDetails.userAgent,
            metadata: parsedDetails.metadata,
          } as AuditLogEntry;
        } catch (error) {
          // If parsing fails, return the basic log
          return {
            ...item,
            severity: 'LOW' as const,
            category: 'SYSTEM' as const,
          } as AuditLogEntry;
        }
      }).filter(Boolean);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      throw error;
    }
  }
);

const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<AuditState['filters']>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    addLog: (state, action: PayloadAction<AuditLogEntry>) => {
      state.logs.unshift(action.payload);
    },
    clearLogs: (state) => {
      state.logs = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLogs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload.filter((item): item is AuditLogEntry => item !== null);
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch audit logs';
      })
      .addCase(logSecurityEvent.fulfilled, (state, action) => {
        if (action.payload) {
          state.logs.unshift(action.payload);
        }
      })
      .addCase(logAuthEvent.fulfilled, (state, action) => {
        if (action.payload) {
          state.logs.unshift(action.payload);
        }
      })
      .addCase(logAdminEvent.fulfilled, (state, action) => {
        if (action.payload) {
          state.logs.unshift(action.payload);
        }
      })
      .addCase(logDataEvent.fulfilled, (state, action) => {
        if (action.payload) {
          state.logs.unshift(action.payload);
        }
      })
      .addCase(logFMVOverride.fulfilled, (state, action) => {
        if (action.payload) {
          state.logs.unshift(action.payload);
        }
      });
  },
});

export const { setFilters, clearFilters, addLog, clearLogs } = auditSlice.actions;
export default auditSlice.reducer; 