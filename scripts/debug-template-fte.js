// Debug script to check FTE field mapping in templates
// Run this in the browser console on the Templates page

console.log('🔍 Debugging FTE field mapping in templates...');

// Check what provider is selected
if (window.store) {
  const state = window.store.getState();
  
  // Get the selected provider from the preview modal
  const selectedProvider = state.templates?.selectedProviderForPreview;
  
  if (selectedProvider) {
    console.log('📊 Selected Provider Data:', selectedProvider);
    
    // Check for FTE fields
    console.log('🔍 Checking FTE fields...');
    
    // Direct FTE field
    console.log('Direct FTE field:', selectedProvider.fte);
    
    // Check dynamicFields for FTE breakdown
    if (selectedProvider.dynamicFields) {
      try {
        const dynamicFields = typeof selectedProvider.dynamicFields === 'string' 
          ? JSON.parse(selectedProvider.dynamicFields) 
          : selectedProvider.dynamicFields;
        
        console.log('📋 Dynamic Fields:', dynamicFields);
        
        // Look for FTE-related fields
        const fteFields = {};
        Object.entries(dynamicFields).forEach(([key, value]) => {
          if (key.toLowerCase().includes('fte')) {
            fteFields[key] = value;
          }
        });
        
        console.log('🎯 FTE Fields found:', fteFields);
        
        // Check what the template is looking for
        console.log('🔍 Template placeholders that might need FTE data:');
        console.log('- {{FTEBreakdown}}');
        console.log('- {{ClinicalFTE}}');
        console.log('- {{MedicalDirectorFTE}}');
        console.log('- {{DivisionChiefFTE}}');
        console.log('- {{ResearchFTE}}');
        console.log('- {{TeachingFTE}}');
        console.log('- {{TotalFTE}}');
        
      } catch (e) {
        console.error('❌ Error parsing dynamicFields:', e);
      }
    } else {
      console.log('❌ No dynamicFields found in provider data');
    }
    
    // Check template mapping
    const templateMappings = state.templates?.mappings;
    if (templateMappings) {
      console.log('📋 Template Mappings:', templateMappings);
    }
    
  } else {
    console.log('❌ No provider selected for preview');
  }
  
  // Check available templates
  const templates = state.templates?.templates;
  if (templates) {
    console.log('📄 Available Templates:', templates.map(t => ({
      id: t.id,
      name: t.name,
      hasHtmlContent: !!(t.editedHtmlContent || t.htmlPreviewContent)
    })));
  }
  
} else {
  console.log('❌ Redux store not accessible');
}

console.log('✅ FTE field debugging complete'); 