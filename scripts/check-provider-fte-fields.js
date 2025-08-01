// Run this in the browser console to check FTE fields in provider data
console.log('🔍 Checking FTE fields in provider data...');

if (window.store) {
  const state = window.store.getState();
  const providers = state.provider?.providers || [];
  
  console.log(`📊 Found ${providers.length} providers`);
  
  providers.forEach((provider, index) => {
    console.log(`\n👤 Provider ${index + 1}: ${provider.name}`);
    
    // Check direct FTE field
    console.log(`   Direct FTE: ${provider.fte}`);
    
    // Check dynamicFields for FTE
    if (provider.dynamicFields) {
      try {
        const dynamicFields = typeof provider.dynamicFields === 'string' 
          ? JSON.parse(provider.dynamicFields) 
          : provider.dynamicFields;
        
        const fteFields = {};
        Object.entries(dynamicFields).forEach(([key, value]) => {
          if (key.toLowerCase().includes('fte')) {
            fteFields[key] = value;
          }
        });
        
        if (Object.keys(fteFields).length > 0) {
          console.log(`   🎯 FTE Fields:`, fteFields);
        } else {
          console.log(`   ❌ No FTE fields found in dynamicFields`);
        }
        
        // Show all dynamic fields for reference
        console.log(`   📋 All dynamic fields:`, Object.keys(dynamicFields));
        
      } catch (e) {
        console.error(`   ❌ Error parsing dynamicFields:`, e);
      }
    } else {
      console.log(`   ❌ No dynamicFields found`);
    }
  });
  
  // Check what templates are looking for
  console.log('\n🔍 Template placeholders that need FTE data:');
  console.log('- {{FTEBreakdown}}');
  console.log('- {{ClinicalFTE}}');
  console.log('- {{MedicalDirectorFTE}}');
  console.log('- {{DivisionChiefFTE}}');
  console.log('- {{ResearchFTE}}');
  console.log('- {{TeachingFTE}}');
  console.log('- {{TotalFTE}}');
  
} else {
  console.log('❌ Redux store not accessible');
}

console.log('✅ FTE field check complete'); 