#!/usr/bin/env node

/**
 * Force Amplify Redeploy Script
 * 
 * This script forces Amplify to redeploy with the correct bucket configuration
 * by updating key files with timestamps to trigger rebuilds.
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 FORCING AMPLIFY REDEPLOY WITH CORRECT BUCKET CONFIG...');

// Files to update with timestamps
const filesToUpdate = [
  'src/App.tsx',
  'src/features/templates/TemplateManager.tsx',
  'src/utils/s3Storage.ts',
  'amplify/backend/storage/s3bfe8ebde/cli-inputs.json'
];

const timestamp = new Date().toISOString();

filesToUpdate.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Add timestamp comment at the top
      const timestampComment = `// AMPLIFY REDEPLOY TRIGGER: ${timestamp}\n`;
      
      if (!content.includes('AMPLIFY REDEPLOY TRIGGER')) {
        content = timestampComment + content;
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${filePath}`);
      } else {
        console.log(`⏭️  Already updated: ${filePath}`);
      }
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
});

console.log('\n📋 NEXT STEPS:');
console.log('1. Commit and push these changes');
console.log('2. Go to AWS Amplify Console');
console.log('3. Trigger a manual deployment');
console.log('4. This will force Amplify to use the correct bucket configuration');
console.log('\n🎯 EXPECTED RESULT:');
console.log('- Amplify Storage will use: contractengine-storage-wherdzik');
console.log('- Templates should load properly');
console.log('- No more 403 Forbidden errors'); 