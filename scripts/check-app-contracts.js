// This script checks what contracts the app can actually see
// Run this in the browser console on your Generate page

console.log('🔍 Checking app contract data...');

// Check Redux state
if (window.__REDUX_DEVTOOLS_EXTENSION__) {
  console.log('✅ Redux DevTools available');
} else {
  console.log('❌ Redux DevTools not available');
}

// Check if we can access the store
if (window.store) {
  const state = window.store.getState();
  console.log('📊 Redux State:', state);
  
  if (state.generator && state.generator.generatedContracts) {
    console.log('📋 Generated Contracts in Redux:', state.generator.generatedContracts);
    console.log('📊 Contract Count:', state.generator.generatedContracts.length);
    
    state.generator.generatedContracts.forEach((contract, index) => {
      console.log(`📄 Contract ${index + 1}:`, {
        providerId: contract.providerId,
        templateId: contract.templateId,
        status: contract.status,
        generatedAt: contract.generatedAt,
        fileUrl: contract.fileUrl
      });
    });
  } else {
    console.log('❌ No generated contracts in Redux state');
  }
} else {
  console.log('❌ Redux store not accessible');
}

// Check providers
if (window.store && window.store.getState().provider) {
  const providers = window.store.getState().provider.providers;
  console.log('👥 Providers in Redux:', providers.length);
  
  providers.forEach((provider, index) => {
    console.log(`👤 Provider ${index + 1}:`, {
      id: provider.id,
      name: provider.name,
      employeeId: provider.employeeId
    });
  });
}

// Check templates
if (window.store && window.store.getState().templates) {
  const templates = window.store.getState().templates.templates;
  console.log('📄 Templates in Redux:', templates.length);
  
  templates.forEach((template, index) => {
    console.log(`📋 Template ${index + 1}:`, {
      id: template.id,
      name: template.name,
      compensationModel: template.compensationModel
    });
  });
}

console.log('✅ App contract check complete'); 