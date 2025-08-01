// Run this in the browser console to check what placeholders are in the template
console.log('🔍 Debugging template placeholders...');

if (window.store) {
  const state = window.store.getState();
  const templates = state.templates?.templates || [];
  
  console.log(`📊 Found ${templates.length} templates`);
  
  templates.forEach((template, index) => {
    console.log(`\n📄 Template ${index + 1}: ${template.name}`);
    console.log(`   ID: ${template.id}`);
    
    // Check HTML content for placeholders
    const htmlContent = template.editedHtmlContent || template.htmlPreviewContent || '';
    const placeholderMatches = htmlContent.match(/\{\{[^}]+\}\}/g);
    
    if (placeholderMatches) {
      console.log(`   📋 Found placeholders:`, placeholderMatches);
      
      // Check for FTE-related placeholders
      const ftePlaceholders = placeholderMatches.filter(p => 
        p.toLowerCase().includes('fte')
      );
      
      if (ftePlaceholders.length > 0) {
        console.log(`   ⚠️ FTE placeholders found:`, ftePlaceholders);
      }
    } else {
      console.log(`   ❌ No placeholders found`);
    }
  });
  
  // Check current template being previewed
  const currentTemplate = state.templates?.currentTemplate;
  if (currentTemplate) {
    console.log(`\n🎯 Current template being previewed: ${currentTemplate.name}`);
    const htmlContent = currentTemplate.editedHtmlContent || currentTemplate.htmlPreviewContent || '';
    const placeholderMatches = htmlContent.match(/\{\{[^}]+\}\}/g);
    
    if (placeholderMatches) {
      console.log(`   📋 Current template placeholders:`, placeholderMatches);
      
      // Check for FTE-related placeholders
      const ftePlaceholders = placeholderMatches.filter(p => 
        p.toLowerCase().includes('fte')
      );
      
      if (ftePlaceholders.length > 0) {
        console.log(`   ⚠️ FTE placeholders in current template:`, ftePlaceholders);
      }
    }
  }
} else {
  console.log('❌ Redux store not available');
} 