# AG Grid Click Events Guide: Fixing Interactive Elements in Grid Cells

## Problem Description

When using AG Grid with interactive elements (buttons, links, icons) inside cell renderers, the elements often require multiple clicks or "frantic clicking" to respond. This is a common issue where AG Grid's event handling interferes with the interactive elements within cells.

### Symptoms
- Interactive elements in grid cells don't respond to single clicks
- Users need to click 5-10 times "frantically" to trigger actions
- Elements appear clickable but don't execute their functions
- Inconsistent behavior - sometimes works, sometimes doesn't

## Root Cause

AG Grid has aggressive event handling that intercepts click events before they reach interactive elements within cells. The event flow is:

1. User clicks on interactive element
2. AG Grid's row click handlers fire first
3. AG Grid prevents the event from reaching the actual interactive element
4. The click appears to be ignored

## Solution: Use onMouseDown Instead of onClick

### The Fix

Replace `onClick` with `onMouseDown` in your cell renderer:

```tsx
// ❌ DON'T DO THIS (doesn't work reliably)
<button
  onClick={() => handleAction(provider.id)}
  className="..."
>
  Action
</button>

// ✅ DO THIS (works reliably)
<div
  onMouseDown={() => handleAction(provider.id)}
  className="cursor-pointer ..."
  style={{ 
    pointerEvents: 'auto',
    zIndex: 9999,
    position: 'relative'
  }}
>
  Action
</div>
```

### Why This Works

1. **Event Timing**: `onMouseDown` fires immediately when the mouse button is pressed down
2. **Event Order**: Mouse events fire in sequence: `mousedown` → `mouseup` → `click`
3. **Prevents Interference**: By using `onMouseDown`, we capture the event before AG Grid's `onClick` handlers can block it

## Complete Implementation Example

```tsx
// Contract Actions column cell renderer
const contractActionsColumn = {
  headerName: 'Contract Actions',
  field: 'actions',
  width: 160,
  minWidth: 140,
  cellRenderer: (params: any) => {
    const provider = params.data;
    const contract = generatedContracts.find(c => c.providerId === provider.id);
    
    if (contract) {
      const isPartialSuccess = contract.status === 'PARTIAL_SUCCESS';
      const isSuccess = contract.status === 'SUCCESS';
      const isFailed = !isSuccess && !isPartialSuccess;
      
      if (isFailed) {
        return (
          <div className="flex items-center gap-1">
            <span className="text-red-500 text-xs">Generation Failed</span>
          </div>
        );
      }
      
      return (
        <div className="flex items-center gap-1">
          <div
            className={`${isPartialSuccess ? 'text-orange-600 hover:bg-orange-50' : 'text-blue-600 hover:bg-blue-50'} p-1 h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer`}
            style={{ 
              pointerEvents: 'auto',
              zIndex: 9999,
              position: 'relative'
            }}
            title={isPartialSuccess ? "Download Contract (S3 storage failed)" : "Download Contract"}
            onMouseDown={() => downloadContract(provider, contract.templateId)}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div
            className={`${isPartialSuccess ? 'text-orange-600 hover:bg-orange-50' : 'text-blue-600 hover:bg-blue-50'} p-1 h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer`}
            style={{ 
              pointerEvents: 'auto',
              zIndex: 9999,
              position: 'relative'
            }}
            title="Preview Contract"
            onMouseDown={() => handlePreviewGenerate(provider.id)}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
        </div>
      );
    }
    
    return (
      <span className="text-gray-400 text-sm">Not Generated</span>
    );
  },
  sortable: false,
  filter: false,
  resizable: false,
  pinned: null,
};
```

## Required CSS Overrides

Add these CSS rules to ensure interactive elements work properly:

```css
/* Ensure Contract Actions elements are clickable */
.ag-theme-alpine .ag-cell[col-id="actions"] {
  pointer-events: auto !important;
}
.ag-theme-alpine .ag-cell[col-id="actions"] div {
  pointer-events: auto !important;
  z-index: 9999 !important;
  position: relative !important;
  cursor: pointer !important;
}
.ag-theme-alpine .ag-cell[col-id="actions"] div:hover {
  background-color: #f3f4f6 !important;
}
.ag-theme-alpine .ag-cell[col-id="actions"] div:active {
  background-color: #e5e7eb !important;
}
```

## Grid Configuration

Ensure these AG Grid options are set:

```tsx
const gridOptions = {
  suppressRowClickSelection: true, // Disable row click selection to prevent interference
  // ... other options
};
```

## Best Practices

1. **Always use `onMouseDown`** for interactive elements in AG Grid cell renderers
2. **Use `<div>` elements** instead of `<button>` or `<a>` tags to avoid element-specific conflicts
3. **Set high z-index** (9999) to ensure elements are above AG Grid's internal elements
4. **Use inline styles** for critical properties like `pointerEvents` and `zIndex`
5. **Add CSS overrides** to ensure proper styling and behavior
6. **Disable row click selection** when you have interactive elements in cells

## Alternative Solutions (If onMouseDown Doesn't Work)

If `onMouseDown` still doesn't work, try these alternatives:

### 1. Use setTimeout
```tsx
onClick={(e) => {
  e.preventDefault();
  e.stopPropagation();
  setTimeout(() => {
    handleAction(provider.id);
  }, 0);
}}
```

### 2. Use onPointerDown
```tsx
onPointerDown={(e) => {
  e.preventDefault();
  e.stopPropagation();
  handleAction(provider.id);
}}
```

### 3. Replace AG Grid with HTML Table
For critical interactive elements, consider replacing AG Grid with a simple HTML table for that specific column.

## Testing

To verify the fix works:
1. Click the interactive element once
2. It should respond immediately
3. No need for multiple clicks or "frantic clicking"
4. The action should execute reliably every time

## Common Mistakes to Avoid

1. **Don't use `onClick`** - it will be intercepted by AG Grid
2. **Don't forget CSS overrides** - they're essential for proper behavior
3. **Don't use low z-index values** - elements need to be above AG Grid
4. **Don't forget `pointerEvents: 'auto'`** - ensures elements are clickable
5. **Don't use `suppressRowClickSelection: false`** - this enables the interference

## Related Files

- `src/features/generator/hooks/useGeneratorGrid.tsx` - Contains the cell renderer implementation
- `src/features/generator/ContractGenerator.tsx` - Contains the CSS overrides

## Summary

The key to fixing AG Grid click event issues is using `onMouseDown` instead of `onClick` for interactive elements in cell renderers. This prevents AG Grid's event handling from interfering with your interactive elements and ensures reliable single-click behavior. 