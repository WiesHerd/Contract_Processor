const { ContractGenerationLogService } = require('../src/services/contractGenerationLogService');

async function fixContractStatus() {
  console.log('🔧 Starting contract status fix...');
  
  try {
    // Get all contract logs
    let allLogs = [];
    let nextToken = undefined;
    
    do {
      const result = await ContractGenerationLogService.listLogs(undefined, 1000, nextToken);
      if (result && result.items) {
        allLogs = allLogs.concat(result.items);
      }
      nextToken = result?.nextToken;
    } while (nextToken);
    
    console.log(`📊 Found ${allLogs.length} total contract logs`);
    
    // Filter for PARTIAL_SUCCESS contracts
    const partialSuccessLogs = allLogs.filter(log => log.status === 'PARTIAL_SUCCESS');
    console.log(`🔍 Found ${partialSuccessLogs.length} contracts with PARTIAL_SUCCESS status`);
    
    if (partialSuccessLogs.length === 0) {
      console.log('✅ No contracts need status updates');
      return;
    }
    
    // Update each PARTIAL_SUCCESS contract to SUCCESS
    let updatedCount = 0;
    for (const log of partialSuccessLogs) {
      try {
        console.log(`🔄 Updating contract ${log.id} for provider ${log.providerId}...`);
        
        // Update the log entry
        await ContractGenerationLogService.updateLog(log.id, {
          ...log,
          status: 'SUCCESS',
          notes: `${log.notes || ''} [AUTO-FIXED: S3 upload now working, status updated from PARTIAL_SUCCESS to SUCCESS]`
        });
        
        updatedCount++;
        console.log(`✅ Updated contract ${log.id}`);
      } catch (error) {
        console.error(`❌ Failed to update contract ${log.id}:`, error.message);
      }
    }
    
    console.log(`🎉 Successfully updated ${updatedCount} out of ${partialSuccessLogs.length} contracts`);
    
  } catch (error) {
    console.error('❌ Error fixing contract status:', error);
  }
}

// Run the fix
fixContractStatus().then(() => {
  console.log('🏁 Contract status fix completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Contract status fix failed:', error);
  process.exit(1);
}); 