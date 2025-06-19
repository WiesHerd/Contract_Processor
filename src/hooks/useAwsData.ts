import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { awsTemplates, awsProviders, awsMappings, awsClauses, awsAuditLogs } from '@/utils/awsServices';
import { setTemplates } from '@/features/templates/templatesSlice';
import { addProvidersFromCSV, setUploadedColumns } from '@/features/providers/providersSlice';
import { setMappings } from '@/features/templates/mappingsSlice';
import { setClauses } from '@/store/slices/clauseSlice';
import { addAuditLog } from '@/store/slices/auditSlice';

interface UseAwsDataOptions {
  loadTemplates?: boolean;
  loadProviders?: boolean;
  loadMappings?: boolean;
  loadClauses?: boolean;
  loadAuditLogs?: boolean;
}

interface UseAwsDataReturn {
  loading: boolean;
  error: string | null;
  loaded: {
    templates: boolean;
    providers: boolean;
    mappings: boolean;
    clauses: boolean;
    auditLogs: boolean;
  };
}

export function useAwsData(options: UseAwsDataOptions = {}): UseAwsDataReturn {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState({
    templates: false,
    providers: false,
    mappings: false,
    clauses: false,
    auditLogs: false,
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const promises: Promise<any>[] = [];

        // Load templates
        if (options.loadTemplates !== false) {
          promises.push(
            awsTemplates.list(1000).then(result => {
              if (result?.items) {
                const templates = result.items.filter(t => t !== null).map(template => ({
                  id: template.id,
                  name: template.name,
                  description: template.description || '',
                  version: template.version || '1.0',
                  s3Key: template.s3Key,
                  type: template.type || 'DOCX',
                  contractYear: template.contractYear || new Date().getFullYear().toString(),
                  compensationModel: 'BASE' as const,
                  clauses: [],
                  tags: [],
                  metadata: {},
                  versionHistory: [],
                  createdAt: template.createdAt || new Date().toISOString(),
                  updatedAt: template.updatedAt || new Date().toISOString(),
                }));
                dispatch(setTemplates(templates));
                setLoaded(prev => ({ ...prev, templates: true }));
              }
            })
          );
        }

        // Load providers
        if (options.loadProviders !== false) {
          promises.push(
            awsProviders.list(1000).then(result => {
              if (result?.items) {
                const providers = result.items.filter(p => p !== null).map(provider => ({
                  id: provider.id,
                  name: provider.name,
                  credentials: '',
                  specialty: provider.specialty || '',
                  startDate: provider.startDate || '',
                  fte: provider.fte || 0,
                  baseSalary: provider.baseSalary || 0,
                  wRVUTarget: undefined,
                  conversionFactor: undefined,
                  retentionBonus: undefined,
                  templateTag: '',
                  compensationModel: 'BASE' as const,
                  fteBreakdown: [],
                  metadata: {
                    updatedAt: provider.updatedAt || new Date().toISOString().split('T')[0],
                  },
                }));
                
                // Convert to CSV format for addProvidersFromCSV
                const csvData = providers.map(p => ({
                  name: p.name,
                  credentials: p.credentials,
                  specialty: p.specialty,
                  startDate: p.startDate,
                  fte: p.fte.toString(),
                  baseSalary: p.baseSalary.toString(),
                  templateTag: p.templateTag,
                  compensationModel: p.compensationModel,
                }));
                
                dispatch(addProvidersFromCSV(csvData));
                
                // Extract columns from first provider if available
                if (providers.length > 0) {
                  const columns = Object.keys(providers[0]).filter(key => 
                    key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && key !== '__typename'
                  );
                  dispatch(setUploadedColumns(columns));
                }
                
                setLoaded(prev => ({ ...prev, providers: true }));
              }
            })
          );
        }

        // Load mappings
        if (options.loadMappings !== false) {
          promises.push(
            awsMappings.list(1000).then(result => {
              if (result?.items) {
                const mappings = result.items.filter(m => m !== null).map(mapping => ({
                  id: mapping.id,
                  templateID: mapping.templateID,
                  providerID: mapping.providerID,
                  field: mapping.field,
                  value: mapping.value || '',
                }));
                dispatch(setMappings(mappings));
                setLoaded(prev => ({ ...prev, mappings: true }));
              }
            })
          );
        }

        // Load clauses
        if (options.loadClauses !== false) {
          promises.push(
            awsClauses.list(1000).then(result => {
              if (result?.items) {
                const clauses = result.items.filter(c => c !== null).map(clause => ({
                  id: clause.id,
                  title: clause.text.substring(0, 50) + '...',
                  content: clause.text,
                  type: 'STANDARD' as const,
                  category: 'GENERAL' as const,
                  tags: clause.tags?.filter(t => t !== null) || [],
                  conditions: clause.condition ? [{ field: 'default', operator: 'exists' as const }] : [],
                  metadata: {},
                  createdAt: clause.createdAt,
                  updatedAt: clause.updatedAt,
                }));
                dispatch(setClauses(clauses));
                setLoaded(prev => ({ ...prev, clauses: true }));
              }
            })
          );
        }

        // Load audit logs
        if (options.loadAuditLogs !== false) {
          promises.push(
            awsAuditLogs.list(1000).then(result => {
              if (result?.items) {
                const auditLogs = result.items.filter(a => a !== null).map(auditLog => ({
                  id: auditLog.id,
                  action: auditLog.action,
                  user: auditLog.user || 'Unknown',
                  timestamp: auditLog.timestamp,
                  details: auditLog.details || '',
                  metadata: {},
                }));
                
                // Add each audit log individually
                auditLogs.forEach(log => dispatch(addAuditLog(log)));
                setLoaded(prev => ({ ...prev, auditLogs: true }));
              }
            })
          );
        }

        await Promise.allSettled(promises);
      } catch (err) {
        console.error('Error loading AWS data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data from AWS');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dispatch, options]);

  return { loading, error, loaded };
}

// Hook for loading specific data types
export function useTemplates() {
  return useAwsData({ loadTemplates: true, loadProviders: false, loadMappings: false, loadClauses: false, loadAuditLogs: false });
}

export function useProviders() {
  return useAwsData({ loadTemplates: false, loadProviders: true, loadMappings: false, loadClauses: false, loadAuditLogs: false });
}

export function useMappings() {
  return useAwsData({ loadTemplates: false, loadProviders: false, loadMappings: true, loadClauses: false, loadAuditLogs: false });
}

export function useClauses() {
  return useAwsData({ loadTemplates: false, loadProviders: false, loadMappings: false, loadClauses: true, loadAuditLogs: false });
}

export function useAuditLogs() {
  return useAwsData({ loadTemplates: false, loadProviders: false, loadMappings: false, loadClauses: false, loadAuditLogs: true });
} 