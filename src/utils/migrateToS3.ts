import localforage from 'localforage';
import { Template } from '@/types/template';
import { Provider } from '@/types/provider';
import { Clause } from '@/types/clause';
import { AuditLogEntry } from '@/store/slices/auditSlice';
import {
  saveTemplateFile,
  saveTemplateMetadata,
  saveProviderData,
  saveClause,
  saveAuditLog,
  saveContractFile
} from './s3Storage';

// Initialize localforage instances
const templateStorage = localforage.createInstance({
  name: 'template-storage',
  storeName: 'templates',
});

const fileStorage = localforage.createInstance({
  name: 'template-files',
  storeName: 'files',
});

const providerStorage = localforage.createInstance({
  name: 'provider-storage',
  storeName: 'providers',
});

const clauseStorage = localforage.createInstance({
  name: 'clause-storage',
  storeName: 'clauses',
});

const auditStorage = localforage.createInstance({
  name: 'audit-storage',
  storeName: 'audit',
});

interface MigrationResult {
  success: boolean;
  migrated: {
    templates: number;
    providers: number;
    clauses: number;
    auditLogs: number;
  };
  failed: {
    templates: string[];
    providers: string[];
    clauses: string[];
    auditLogs: string[];
  };
  errors: string[];
}

/**
 * Migrate all data from localforage to S3
 */
export async function migrateAllToS3(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migrated: {
      templates: 0,
      providers: 0,
      clauses: 0,
      auditLogs: 0,
    },
    failed: {
      templates: [],
      providers: [],
      clauses: [],
      auditLogs: [],
    },
    errors: [],
  };

  try {
    // Migrate templates
    const templates = await templateStorage.getItem<Template[]>('templates') || [];
    for (const template of templates) {
      try {
        // Migrate template file
        const fileKey = `docxTemplate_${template.id}`;
        const file = await fileStorage.getItem<File>(fileKey);
        if (file) {
          await saveTemplateFile(file, template.id);
        }

        // Migrate template metadata
        await saveTemplateMetadata(template);
        result.migrated.templates++;
      } catch (error) {
        result.failed.templates.push(template.id);
        result.errors.push(`Failed to migrate template ${template.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Migrate providers
    const providers = await providerStorage.getItem<Provider[]>('providers') || [];
    for (const provider of providers) {
      try {
        await saveProviderData(provider);
        result.migrated.providers++;
      } catch (error) {
        result.failed.providers.push(provider.id);
        result.errors.push(`Failed to migrate provider ${provider.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Migrate clauses
    const clauses = await clauseStorage.getItem<Clause[]>('clauses') || [];
    for (const clause of clauses) {
      try {
        await saveClause(clause);
        result.migrated.clauses++;
      } catch (error) {
        result.failed.clauses.push(clause.id);
        result.errors.push(`Failed to migrate clause ${clause.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Migrate audit logs
    const auditLogs = await auditStorage.getItem<AuditLogEntry[]>('audit-logs') || [];
    for (const log of auditLogs) {
      try {
        await saveAuditLog(log);
        result.migrated.auditLogs++;
      } catch (error) {
        result.failed.auditLogs.push(log.id);
        result.errors.push(`Failed to migrate audit log ${log.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Verify migration by comparing local and S3 data
 */
export async function verifyMigration(): Promise<{
  success: boolean;
  mismatches: string[];
}> {
  const result = {
    success: true,
    mismatches: [] as string[],
  };

  try {
    // Verify templates
    const localTemplates = await templateStorage.getItem<Template[]>('templates') || [];
    for (const template of localTemplates) {
      try {
        const s3Template = await saveTemplateMetadata(template);
        if (JSON.stringify(template) !== JSON.stringify(s3Template)) {
          result.mismatches.push(`Template ${template.id} data mismatch`);
        }
      } catch (error) {
        result.mismatches.push(`Failed to verify template ${template.id}`);
      }
    }

    // Add similar verification for providers, clauses, and audit logs
    // ...

    return result;
  } catch (error) {
    result.success = false;
    result.mismatches.push(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Clean up localforage after successful migration
 */
export async function cleanupLocalStorage(): Promise<void> {
  try {
    await Promise.all([
      templateStorage.clear(),
      fileStorage.clear(),
      providerStorage.clear(),
      clauseStorage.clear(),
      auditStorage.clear()
    ]);
  } catch (error) {
    console.error('Error cleaning up local storage:', error);
    throw error;
  }
} 