# AG Grid Pinning Issues Log

## Issue #1: Internal Scrollbar in Pinned Columns (January 2025)

### Problem Description
- **Date**: January 2025
- **Component**: ContractGenerator (`/generate` screen)
- **Issue**: Provider Name column had an internal horizontal scrollbar placeholder appearing within the column itself
- **User Report**: "Why is there a placeholder for a horizontal scrollbar, or slide bar in the Provider Name Column..that doesn't make sense"

### Root Cause Analysis
1. **Custom Cell Renderer Conflict**: The Provider Name column had a custom `cellRenderer` that returned a React component with `truncate` class
2. **CSS Conflicts**: The custom renderer was conflicting with AG Grid's internal styling and `cellStyle` properties
3. **Overflow Handling**: AG Grid was trying to create its own internal scrollbar for the column due to conflicting styles

### Initial Failed Attempts
1. **Removed pinning entirely** - This broke user expectations and created new issues
2. **Aggressive CSS overrides** - Hiding ALL scrollbars caused problems with main grid scrollbars
3. **HTML string cellRenderer** - Created literal HTML tags showing in the column

### Final Solution Applied
1. **Removed problematic cellRenderer** from Provider Name column
2. **Simplified column configuration** - kept only essential `cellStyle` properties
3. **Added proper CSS for pinned columns**:
   ```css
   /* Fix pinned column scrollbar issues */
   .ag-theme-alpine .ag-pinned-left {
     overflow: hidden !important;
   }
   .ag-theme-alpine .ag-pinned-left::-webkit-scrollbar {
     display: none !important;
   }
   ```
4. **Added "Fit Columns" button** for manual column width adjustment

### Files Modified
- `src/features/generator/ContractGenerator.tsx`
  - Removed custom `cellRenderer` from Provider Name column
  - Added proper CSS overrides for pinned columns
  - Added "Fit Columns" button

---

## Issue #2: Automatic Pinning Override (January 2025)

### Problem Description
- **Date**: January 2025
- **Component**: ProviderManager (`/providers` screen)
- **Issue**: Provider Name column remained pinned even after user manually unpinned it via Column Manager
- **User Report**: "I unselected Provider Name but it has no effect on the Provider Name pinning"

### Root Cause Analysis
1. **Automatic Pinning useEffect**: Lines 329-343 in ProviderManager had a `useEffect` that automatically pinned the Provider Name column
2. **Preference Override**: The `useEffect` ran every time and re-pinned the column even after manual unpinning
3. **Default Behavior**: The code was designed to pin the first column by default, but it was overriding user preferences

### Investigation Process
1. **Checked Column Manager UI** - UI showed column as unpinned (bookmark icon not highlighted)
2. **Verified Grid Display** - Column was still visually pinned in the grid
3. **Traced Pin Logic** - Found automatic pinning in `useEffect` that was overriding manual changes
4. **Identified Conflict** - Automatic pinning was running after user preferences were saved

### Final Solution Applied
**Disabled the automatic pinning entirely**:
```typescript
// Disabled automatic pinning - let user control pinning manually
// useEffect(() => {
//   if (preferences && (!preferences.columnPinning || Object.keys(preferences.columnPinning).length === 0)) {
//     // Only set default pinning if user hasn't explicitly unpinned columns
//     // This prevents auto-pinning from overriding user preferences
//     if (providerNameCol && !preferences.columnPinning?.left?.includes(providerNameCol)) {
//       const newPinning = { left: [providerNameCol] };
//       updateColumnPinning(newPinning);
//     } else if (columnOrder.length > 0 && !preferences.columnPinning?.left?.includes(columnOrder[0])) {
//       // Pin the first column (usually name) by default only if not already unpinned
//       const firstCol = columnOrder[0];
//       if (firstCol) {
//         const newPinning = { left: [firstCol] };
//         updateColumnPinning(newPinning);
//       }
//     }
//   }
// }, [providerNameCol, preferences, updateColumnPinning, columnOrder]);
```

### Files Modified
- `src/features/providers/ProviderManager.tsx`
  - Commented out automatic pinning `useEffect`
  - Now relies entirely on user manual pinning preferences

---

## Best Practices Established

### 1. Pinned Column CSS
Always use these CSS rules for pinned columns to prevent internal scrollbars:
```css
.ag-theme-alpine .ag-pinned-left {
  overflow: hidden !important;
}
.ag-theme-alpine .ag-pinned-left::-webkit-scrollbar {
  display: none !important;
}
.ag-theme-alpine .ag-pinned-left {
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}
```

### 2. Column Configuration
- **Avoid custom cellRenderers** for pinned columns unless absolutely necessary
- **Use simple cellStyle** properties instead of complex renderers
- **Let AG Grid handle** the default rendering for pinned columns

### 3. Pinning Preferences
- **Never auto-pin** columns without explicit user action
- **Respect user preferences** - don't override manual pinning/unpinning
- **Use native AG Grid pinning** controls when possible
- **Test pinning behavior** after any column configuration changes

### 4. Debugging Pinning Issues
1. **Check for automatic pinning** in `useEffect` hooks
2. **Verify preference storage** and retrieval
3. **Inspect column definitions** for hardcoded `pinned` properties
4. **Test with Column Manager** UI to ensure consistency
5. **Check CSS overrides** that might affect pinned columns

---

## Common AG Grid Pinning Patterns

### Native AG Grid Pinning (Recommended)
```typescript
// Enable native column menu with pinning options
defaultColDef={{ 
  menuTabs: ['generalMenuTab', 'filterMenuTab', 'columnsMenuTab'],
  resizable: true,
  sortable: true,
  filter: true
}}
```

### Manual Pinning Control
```typescript
// Apply pinning from user preferences
let pinned: 'left' | 'right' | undefined;
if (leftPinned.includes(field)) {
  pinned = 'left';
} else if (rightPinned.includes(field)) {
  pinned = 'right';
}
```

### CSS for Pinned Columns
```css
/* Always include these for pinned columns */
.ag-theme-alpine .ag-pinned-left,
.ag-theme-alpine .ag-pinned-right {
  overflow: hidden !important;
}
.ag-theme-alpine .ag-pinned-left::-webkit-scrollbar,
.ag-theme-alpine .ag-pinned-right::-webkit-scrollbar {
  display: none !important;
}
```

---

## Future Prevention Checklist

- [ ] **Before adding pinning**: Check for existing automatic pinning logic
- [ ] **After pinning changes**: Test manual pin/unpin functionality
- [ ] **CSS changes**: Verify pinned columns don't get internal scrollbars
- [ ] **Column renderers**: Avoid complex renderers for pinned columns
- [ ] **User preferences**: Always respect manual pinning preferences
- [ ] **Testing**: Test pinning behavior on both `/providers` and `/generate` screens

---

*Last Updated: January 2025*
*Maintained by: Development Team* 