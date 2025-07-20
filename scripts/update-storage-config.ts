import fs from 'fs';
import path from 'path';

function updateStorageConfig() {
  console.log('🔧 Updating storage configuration...');
  
  // Update useContractGeneration.ts to prioritize immutable storage
  const contractGenerationPath = 'src/features/generator/hooks/useContractGeneration.ts';
  if (fs.existsSync(contractGenerationPath)) {
    let content = fs.readFileSync(contractGenerationPath, 'utf8');
    
    // Update the storage priority to use only immutable storage
    content = content.replace(
      /\/\/ Try immutable storage first, then S3 storage, then Amplify storage/g,
      '// Use only immutable storage (working system)'
    );
    
    // Remove S3 storage fallback and keep only immutable storage
    content = content.replace(
      /try {\s*const immutableUrl = await immutableContractStorage\.getPermanentDownloadUrl\(contractId\);\s*if \(immutableUrl\) {\s*return immutableUrl;\s*}\s*}/g,
      `try {
        const immutableUrl = await immutableContractStorage.getPermanentDownloadUrl(contractId);
        if (immutableUrl) {
          return immutableUrl;
        }
      }`
    );
    
    // Remove S3 storage fallback
    content = content.replace(
      /\/\/ Try S3 storage as fallback[\s\S]*?} catch \(s3Error\) {[\s\S]*?}/g,
      '// S3 storage removed - using only immutable storage'
    );
    
    fs.writeFileSync(contractGenerationPath, content);
    console.log('✅ Updated useContractGeneration.ts');
  }
  
  // Update useBulkGeneration.ts to use only immutable storage
  const bulkGenerationPath = 'src/features/generator/hooks/useBulkGeneration.ts';
  if (fs.existsSync(bulkGenerationPath)) {
    let content = fs.readFileSync(bulkGenerationPath, 'utf8');
    
    // Replace any direct S3 uploads with immutable storage
    content = content.replace(
      /await s3Storage\.uploadContract\(/g,
      'await immutableContractStorage.uploadContract('
    );
    
    fs.writeFileSync(bulkGenerationPath, content);
    console.log('✅ Updated useBulkGeneration.ts');
  }
  
  console.log('🎉 Storage configuration updated!');
  console.log('📝 The app will now use only the working contracts/immutable/ storage system.');
}

updateStorageConfig(); 