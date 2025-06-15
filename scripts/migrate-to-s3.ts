import 'dotenv/config';
import { migrateAllToS3, verifyMigration } from '../src/utils/migrateToS3';

async function runMigration() {
  console.log('Starting migration to S3...\n');

  try {
    // Run migration
    console.log('Migrating data...');
    const migrationResult = await migrateAllToS3();
    
    // Print migration results
    console.log('\nMigration Results:');
    console.log('------------------');
    console.log(`Success: ${migrationResult.success}`);
    console.log('\nMigrated Items:');
    console.log(`- Templates: ${migrationResult.migrated.templates}`);
    console.log(`- Providers: ${migrationResult.migrated.providers}`);
    console.log(`- Clauses: ${migrationResult.migrated.clauses}`);
    console.log(`- Audit Logs: ${migrationResult.migrated.auditLogs}`);

    if (migrationResult.failed.templates.length > 0 ||
        migrationResult.failed.providers.length > 0 ||
        migrationResult.failed.clauses.length > 0 ||
        migrationResult.failed.auditLogs.length > 0) {
      console.log('\nFailed Items:');
      if (migrationResult.failed.templates.length > 0) {
        console.log('- Templates:', migrationResult.failed.templates);
      }
      if (migrationResult.failed.providers.length > 0) {
        console.log('- Providers:', migrationResult.failed.providers);
      }
      if (migrationResult.failed.clauses.length > 0) {
        console.log('- Clauses:', migrationResult.failed.clauses);
      }
      if (migrationResult.failed.auditLogs.length > 0) {
        console.log('- Audit Logs:', migrationResult.failed.auditLogs);
      }
    }

    if (migrationResult.errors.length > 0) {
      console.log('\nErrors:');
      migrationResult.errors.forEach(error => console.log(`- ${error}`));
    }

    // Verify migration
    console.log('\nVerifying migration...');
    const verificationResult = await verifyMigration();
    
    console.log('\nVerification Results:');
    console.log('-------------------');
    console.log(`Success: ${verificationResult.success}`);
    
    if (verificationResult.mismatches.length > 0) {
      console.log('\nMismatches:');
      verificationResult.mismatches.forEach(mismatch => console.log(`- ${mismatch}`));
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 