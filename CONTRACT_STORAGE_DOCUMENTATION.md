# Contract Storage System Documentation

## 🎯 **ESTABLISHED CONTRACT STORAGE LOCATION**

**All contracts are stored in a single, consistent location:**

```
S3 Bucket: {VITE_S3_BUCKET}
Path: contracts/immutable/{contractId}/{filename}
```

## 📁 **CONTRACT ID FORMAT**

**Standard Contract ID**: `{providerId}-{templateId}-{contractYear}`

**Example**: `ae25ed3b-840b-452f-ab77-1651b975e607-5fd5c4b1-fa21-43d7-8bfe-49f706a17593-2025`

## 📋 **COMPLETE FILE PATH STRUCTURE**

```
contracts/
└── immutable/
    └── {providerId}-{templateId}-{contractYear}/
        └── {filename}.docx
```

**Example Path**: `contracts/immutable/ae25ed3b-840b-452f-ab77-1651b975e607-5fd5c4b1-fa21-43d7-8bfe-49f706a17593-2025/2025_JefferyWilliams_ScheduleA_2025-07-25.docx`

## 🔧 **IMPLEMENTATION DETAILS**

### **1. S3 Storage Functions** (`src/utils/s3Storage.ts`)

- **`saveContractFile(file, contractId, metadata)`**: Saves contract to `contracts/immutable/{contractId}/{filename}`
- **`getContractFile(contractId, fileName)`**: Retrieves contract from `contracts/immutable/{contractId}/{filename}`
- **`regenerateContractDownloadUrl(contractId, fileName)`**: Generates fresh download URL
- **`listContractFiles(contractId)`**: Lists all files for a contract
- **`deleteFile(key)`**: Deletes file from S3

### **2. Contract Generation** (`src/features/generator/hooks/useBulkGeneration.ts`)

- **Contract ID Construction**: `provider.id + '-' + assignedTemplate.id + '-' + contractYear`
- **S3 Upload**: Uses `saveContractFile()` with standardized path
- **DynamoDB Logging**: Stores contract metadata including S3 key

### **3. Contract Retrieval** (`src/features/generator/hooks/useGeneratorGrid.tsx`)

- **Download Button**: Uses `getContractFile()` to generate signed URL
- **Preview Button**: Uses same function for preview

### **4. Contract Cleanup** (`src/features/generator/hooks/useGeneratorDataManagement.ts`)

- **Clear All**: Deletes from both DynamoDB and S3
- **S3 Key Construction**: `contracts/immutable/{contractId}/{filename}`

## 🗄️ **DATABASE STORAGE**

### **DynamoDB Schema** (`ContractGenerationLog`)

```typescript
{
  id: string;                    // DynamoDB primary key
  providerId: string;           // Provider identifier
  contractYear: string;         // Contract year (e.g., "2025")
  templateId: string;           // Template identifier
  generatedAt: string;          // ISO timestamp
  status: string;               // "SUCCESS", "PARTIAL_SUCCESS", "FAILED"
  fileUrl: string;              // Filename (e.g., "2025_JefferyWilliams_ScheduleA_2025-07-25.docx")
  notes?: string;               // Optional notes
}
```

### **Redux State** (`generatedContracts`)

```typescript
{
  providerId: string;
  templateId: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  generatedAt: string;
  fileUrl: string;
  fileName: string;
  s3Key: string;                // Contract ID (not full S3 path)
  localFilePath: string;
  s3Status: 'SUCCESS' | 'FAILED';
  dynamoDbStatus: 'SUCCESS' | 'FAILED';
  error?: string;
  dynamoDbId?: string;
}
```

## 🔗 **DOWNLOAD URL GENERATION**

1. **Contract ID**: `{providerId}-{templateId}-{contractYear}`
2. **S3 Key**: `contracts/immutable/{contractId}/{filename}`
3. **Signed URL**: Generated with 7-day expiration for security
4. **File Storage**: Permanent in S3, only URLs expire

## 🧹 **CLEANUP OPERATIONS**

### **Clear All Processed Contracts**

1. **Fetch**: All processed contracts from DynamoDB
2. **Delete DynamoDB**: Remove contract logs
3. **Delete S3**: Remove contract files using constructed S3 keys
4. **Clear Redux**: Remove from local state

### **S3 Cleanup Script**

**File**: `scripts/cleanup-s3-contracts.js`
**Purpose**: Clean up existing S3 remnants
**Usage**: `node scripts/cleanup-s3-contracts.js`

## ⚠️ **IMPORTANT RULES**

1. **NEVER CHANGE** the storage path without updating all related functions
2. **ALWAYS USE** the standardized contract ID format
3. **CONSISTENT PATHS**: All functions must use `contracts/immutable/{contractId}/{filename}`
4. **CLEANUP**: Always delete both DynamoDB and S3 when clearing contracts
5. **DOCUMENTATION**: Update this file when making changes

## 🔍 **TROUBLESHOOTING**

### **"NoSuchKey" Error**
- **Cause**: File not found in S3 at expected location
- **Check**: Verify contract was uploaded to `contracts/immutable/{contractId}/{filename}`
- **Fix**: Regenerate contract or check S3 path consistency

### **Missing Contracts in "Processed" Tab**
- **Cause**: Contract not in Redux state or DynamoDB
- **Check**: Verify contract generation completed successfully
- **Fix**: Check S3 upload and DynamoDB logging

### **S3 Cleanup Issues**
- **Cause**: Inconsistent S3 paths or missing files
- **Check**: Verify all functions use same path structure
- **Fix**: Run cleanup script and regenerate contracts

## 📝 **CHANGE LOG**

- **2025-01-25**: Established standardized contract storage location
- **2025-01-25**: Fixed S3 path consistency across all functions
- **2025-01-25**: Added comprehensive cleanup functionality
- **2025-01-25**: Created this documentation file 