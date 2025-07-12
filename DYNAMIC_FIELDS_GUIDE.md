# Dynamic Fields System - Enterprise-Grade Column Flexibility

## 🎯 **Overview**

This system provides **automatic detection and display** of new columns in your CSV uploads, making your DynamoDB table truly flexible and enterprise-ready. When you upload a CSV with new columns, they automatically appear in the provider screen with proper formatting and type detection.

## 🔧 **How It Works**

### **1. Automatic Column Detection**

When you upload a CSV file, the system:

1. **Analyzes all columns** in your CSV
2. **Maps known columns** to existing schema fields
3. **Detects new columns** as dynamic fields
4. **Stores them** in the `dynamicFields` JSON field in DynamoDB
5. **Automatically displays them** in the provider table

### **2. Smart Type Detection**

The system automatically detects field types based on:

- **Field name patterns** (e.g., "salary" → currency, "date" → date)
- **Content analysis** (e.g., numeric values → number, "true/false" → boolean)
- **User-defined metadata** for custom formatting

### **3. Enterprise-Grade Column Filtering** ⭐ **NEW**

**Problem Solved**: Previously, empty columns would show up in the provider table, creating a cluttered interface.

**Enterprise Solution**: The system now implements **intelligent column filtering** that:

- ✅ **Only shows columns with actual data**
- ✅ **Hides empty columns completely**
- ✅ **Prevents interface clutter**
- ✅ **Maintains professional appearance**

**How it works**:
1. **Analyzes all providers** to determine which columns have data
2. **Counts data presence** for each column across all providers
3. **Filters out empty columns** before displaying the table
4. **Shows only meaningful columns** with actual content

## 📊 **Column Analysis Example**

```
Columns with Data (3):
├── CustomBonus (2/5 providers - 40%)
├── SpecialAllowance (1/5 providers - 20%)
└── DepartmentCode (3/5 providers - 60%)

Empty Columns (Hidden) (2):
├── UnusedField (0/5 providers - 0%)
└── PlaceholderColumn (0/5 providers - 0%)
```

## 🛠 **Technical Implementation**

### **Enhanced Column Generation**

```typescript
// Enterprise-grade dynamic column generation - only show columns with actual data
const dynamicColumnKeys = useMemo(() => {
  if (!providers || providers.length === 0) return [];
  
  const columnDataMap = new Map<string, { hasData: boolean; count: number; metadata?: any }>();
  
  // First pass: analyze all providers to determine which columns have data
  providers.forEach(provider => {
    // Check schema fields (non-core fields)
    Object.entries(provider).forEach(([key, value]) => {
      if (!CORE_COLUMNS.some(col => col.key === key)) {
        const hasValue = value !== undefined && value !== null && value !== '';
        if (!columnDataMap.has(key)) {
          columnDataMap.set(key, { hasData: false, count: 0 });
        }
        const columnInfo = columnDataMap.get(key)!;
        if (hasValue) {
          columnInfo.hasData = true;
          columnInfo.count++;
        }
      }
    });
    
    // Check dynamic fields
    const dynamicFields = parseDynamicFields(provider.dynamicFields);
    Object.entries(dynamicFields).forEach(([key, value]) => {
      const hasValue = value !== undefined && value !== null && value !== '';
      if (!columnDataMap.has(key)) {
        columnDataMap.set(key, { hasData: false, count: 0 });
      }
      const columnInfo = columnDataMap.get(key)!;
      if (hasValue) {
        columnInfo.hasData = true;
        columnInfo.count++;
      }
    });
  });
  
  // Filter to only include columns that have data in at least one provider
  const validColumns = Array.from(columnDataMap.entries())
    .filter(([key, info]) => info.hasData)
    .map(([key]) => key);
  
  return validColumns;
}, [providers]);
```

### **Benefits**

1. **Clean Interface**: No empty columns cluttering the table
2. **Professional Appearance**: Only meaningful data is displayed
3. **Automatic Adaptation**: New columns appear only when they have data
4. **Performance**: Reduced table complexity and rendering overhead
5. **User Experience**: Focus on relevant information only

## 🧩 **Placeholder Convention**

- Use `{{double_curly}}` tags for all merge fields
- Common placeholders:
  - `{{ProviderName}}`, `{{StartDate}}`, `{{BaseSalary}}`, `{{FTE}}`
  - `{{FTEBreakdown}}` (renders dynamic table)
  - `{{wRVUTarget}}`, `{{ConversionFactor}}`
  - `{{RetentionBonus}}`, `{{LongTermIncentive}}`
- Placeholders are replaced at render time using provider input and template schema
- All contracts must validate that **all required placeholders** are resolved before export

## 🧱 **Template System Rules**

- Templates consist of a `.docx` shell and a `.json` schema file
- Templates can include static text and dynamic clauses (see below)
- Templates must support clause toggling or conditional insertion
  - e.g., `includeIf: provider.hasProductivity === true`

## 🧩 **Clause Engine (Dynamic Text Blocks)**

- Clauses are modular text blocks injected into templates at runtime
- Clauses must be tagged by:
  - applicable provider type
  - compensation model (base, productivity, hybrid)
  - conditional logic field (e.g., "if retentionBonus.amount > 0")
- Clause content may contain placeholders (same tag rules apply)

## 🧾 **Document Output Rules**

- All generated contracts must support:
  - Individual download as `.docx` or `.pdf`
  - Bulk ZIP archive of all generated files
- Signature blocks, watermarking, and version tagging are optional but supported via `{{SignatureBlock}}`, `{{VersionTag}}`, etc.
- FMV warnings must trigger a justification field if exceeded
- Every override action must be logged in `auditSlice`

## ⚙️ **Code Practices**

- Use Redux Toolkit with typed slices
- Never hardcode compensation logic into UI components
- Use `zod` schemas to validate provider input and resolve contract templates
- Render complex sections (e.g., FTE tables, incentive summaries) through reusable utility functions

## 📚 **File Naming Conventions**

- Use camelCase for variables and functions
- Use PascalCase for components
- Use kebab-case for filenames
  - e.g., `provider-upload-form.tsx`
- Use `.tsx` only for files that contain JSX
- Use `.ts` for pure logic (e.g., PDF generation, merge engine)

## 🧪 **Testing Guidance (Optional)**

- All merge engines should have unit tests using dummy provider data
- Validate template inputs using zod schema before contract generation

## 🚀 **Enterprise Features**

### **Column Filtering**
- ✅ Only shows columns with actual data
- ✅ Prevents empty column clutter
- ✅ Maintains professional interface
- ✅ Automatic adaptation to new data

### **Type Detection**
- ✅ Smart field type detection
- ✅ Proper formatting for currency, dates, percentages
- ✅ User-friendly display names
- ✅ Validation and error handling

### **Performance**
- ✅ Efficient column analysis
- ✅ Minimal rendering overhead
- ✅ Optimized for large datasets
- ✅ Responsive user interface

---

**Result**: The dynamic fields system is now **enterprise-grade** with intelligent column filtering that ensures only meaningful data is displayed, providing a clean and professional user experience while maintaining full flexibility for new columns. 