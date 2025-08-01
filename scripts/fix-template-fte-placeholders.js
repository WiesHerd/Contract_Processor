// Run this in the browser console to identify and fix templates with individual FTE placeholders
console.log('🔍 Identifying templates with individual FTE placeholders...');

if (window.store) {
  const state = window.store.getState();
  const templates = state.templates?.templates || [];
  
  console.log(`📊 Found ${templates.length} templates`);
  
  const templatesWithIndividualFTE = [];
  
  templates.forEach((template, index) => {
    console.log(`\n📄 Template ${index + 1}: ${template.name}`);
    console.log(`   ID: ${template.id}`);
    
    // Check HTML content for individual FTE placeholders
    const htmlContent = template.editedHtmlContent || template.htmlPreviewContent || '';
    const placeholderMatches = htmlContent.match(/\{\{[^}]+\}\}/g);
    
    if (placeholderMatches) {
      // Check for individual FTE placeholders (not FTEBreakdown)
      const individualFTEPlaceholders = placeholderMatches.filter(p => 
        p.toLowerCase().includes('fte') && 
        !p.toLowerCase().includes('ftebreakdown') &&
        !p.toLowerCase().includes('fte') === 'fte'
      );
      
      if (individualFTEPlaceholders.length > 0) {
        console.log(`   ⚠️ Found individual FTE placeholders:`, individualFTEPlaceholders);
        templatesWithIndividualFTE.push({
          template,
          placeholders: individualFTEPlaceholders
        });
      } else {
        console.log(`   ✅ No individual FTE placeholders found`);
      }
    }
  });
  
  if (templatesWithIndividualFTE.length > 0) {
    console.log(`\n🎯 Found ${templatesWithIndividualFTE.length} templates that need fixing:`);
    
    templatesWithIndividualFTE.forEach((item, index) => {
      console.log(`\n${index + 1}. Template: ${item.template.name}`);
      console.log(`   Individual FTE placeholders: ${item.placeholders.join(', ')}`);
      console.log(`   Template ID: ${item.template.id}`);
      
      // Show the current HTML content
      const htmlContent = item.template.editedHtmlContent || item.template.htmlPreviewContent || '';
      console.log(`   Current HTML snippet:`);
      console.log(htmlContent.substring(0, 500) + '...');
    });
    
    console.log(`\n📝 To fix these templates:`);
    console.log(`1. Go to Templates screen`);
    console.log(`2. Click "Edit HTML" on each template above`);
    console.log(`3. Replace individual FTE placeholders with {{FTEBreakdown}}`);
    console.log(`4. Save the template`);
    console.log(`\nExample replacement:`);
    console.log(`   OLD: Clinical: {{Clinical FTE}}, Research: {{Research FTE}}`);
    console.log(`   NEW: {{FTEBreakdown}}`);
  } else {
    console.log(`\n✅ All templates are using the correct {{FTEBreakdown}} placeholder!`);
  }
} else {
  console.log('❌ Redux store not available');
} 