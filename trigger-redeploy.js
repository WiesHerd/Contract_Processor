// Script to trigger a redeploy by making a small change
import fs from 'fs';

// Add a timestamp comment to force a rebuild
const timestamp = new Date().toISOString();
const comment = `// Template loading fix deployment - ${timestamp}`;

// Files to update with timestamp
const filesToUpdate = [
  'src/App.tsx',
  'src/features/templates/TemplateManager.tsx'
];

console.log('🔄 Triggering redeploy...');
console.log('📝 Adding timestamp comments to force rebuild...');

filesToUpdate.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    // Add comment at the top if not already present
    if (!content.includes('Template loading fix deployment')) {
      const updatedContent = `${comment}\n${content}`;
      fs.writeFileSync(file, updatedContent);
      console.log(`✅ Updated ${file}`);
    } else {
      console.log(`⏭️  ${file} already has deployment comment`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error.message);
  }
});

console.log('');
console.log('📋 Next steps:');
console.log('1. Run: npm run build');
console.log('2. Deploy the updated dist/ folder to AWS Amplify');
console.log('3. Check the Templates page for the new debug logs');
console.log('');
console.log('🔍 Expected console messages after deployment:');
console.log('- "🔄 Starting template hydration from S3..."');
console.log('- "📁 Template folders found: [your template folders]"');
console.log('- "🎉 Template hydration complete. Found X templates."'); 