# LoadingSpinner Component

A reusable, accessible loading spinner component for consistent use across the React application.

## Features

- ✅ **Accessible** - Screen reader friendly with proper ARIA attributes
- ✅ **Customizable** - Multiple size and color variants
- ✅ **Flexible** - Inline and container modes
- ✅ **Consistent** - Uses Tailwind CSS for consistent styling
- ✅ **TypeScript** - Fully typed with TypeScript interfaces

## Basic Usage

```tsx
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Basic usage
<LoadingSpinner />

// With message
<LoadingSpinner message="Loading data..." />

// Custom size
<LoadingSpinner size="lg" />

// Custom color
<LoadingSpinner color="white" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| number` | `'md'` | Size of the spinner (or custom pixel value) |
| `color` | `'primary' \| 'secondary' \| 'white' \| 'gray' \| string` | `'primary'` | Color variant or custom CSS class |
| `message` | `string` | `undefined` | Optional message to display below spinner |
| `label` | `string` | `'Loading...'` | Accessible label for screen readers |
| `className` | `string` | `''` | Additional CSS classes |
| `inline` | `boolean` | `false` | Whether to display inline or as full container |

## Size Variants

```tsx
<LoadingSpinner size="sm" />   // 16px
<LoadingSpinner size="md" />   // 32px (default)
<LoadingSpinner size="lg" />   // 48px
<LoadingSpinner size="xl" />   // 64px
<LoadingSpinner size={80} />   // Custom 80px
```

## Color Variants

```tsx
<LoadingSpinner color="primary" />    // Primary brand color
<LoadingSpinner color="secondary" />  // Secondary brand color
<LoadingSpinner color="white" />      // White (for dark backgrounds)
<LoadingSpinner color="gray" />       // Gray
<LoadingSpinner color="text-blue-600" /> // Custom Tailwind class
```

## Usage Examples

### 1. Basic Loading State

```tsx
const [isLoading, setIsLoading] = useState(false);

return (
  <div>
    {isLoading ? (
      <LoadingSpinner message="Fetching data..." />
    ) : (
      <div>Your content here</div>
    )}
  </div>
);
```

### 2. Button Loading State

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

return (
  <Button onClick={handleSubmit} disabled={isSubmitting}>
    {isSubmitting ? (
      <>
        <LoadingSpinner size="sm" inline />
        <span className="ml-2">Submitting...</span>
      </>
    ) : (
      'Submit'
    )}
  </Button>
);
```

### 3. Page Loading

```tsx
const [isPageLoading, setIsPageLoading] = useState(true);

if (isPageLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner 
        size="xl" 
        message="Loading your dashboard..." 
        color="primary"
      />
    </div>
  );
}
```

### 4. Table Loading

```tsx
const [isLoading, setIsLoading] = useState(false);

return (
  <div className="min-h-[200px]">
    {isLoading ? (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner message="Loading table data..." />
      </div>
    ) : (
      <table>...</table>
    )}
  </div>
);
```

### 5. Modal Loading

```tsx
const [isProcessing, setIsProcessing] = useState(false);

return (
  <div className="modal">
    {isProcessing ? (
      <LoadingSpinner 
        message="Processing your request..." 
        size="lg"
      />
    ) : (
      <div>Modal content</div>
    )}
  </div>
);
```

### 6. Inline Loading

```tsx
return (
  <div className="flex items-center gap-2">
    <span>Processing:</span>
    {isLoading && <LoadingSpinner size="sm" inline />}
  </div>
);
```

## Integration with Existing Components

### Provider Data Manager

```tsx
// In ProviderDataManager.tsx
const [isUploading, setIsUploading] = useState(false);

return (
  <Button onClick={handleUpload} disabled={isUploading}>
    {isUploading ? (
      <>
        <LoadingSpinner size="sm" inline />
        <span className="ml-2">Uploading...</span>
      </>
    ) : (
      'Upload CSV'
    )}
  </Button>
);
```

### Template Management

```tsx
// In TemplateManager.tsx
const [isGenerating, setIsGenerating] = useState(false);

return (
  <div>
    {isGenerating && (
      <LoadingSpinner 
        message="Generating contract document..." 
        size="lg"
      />
    )}
  </div>
);
```

### Bulk Operations

```tsx
// In bulk generation components
const [isProcessing, setIsProcessing] = useState(false);

return (
  <div>
    {isProcessing && (
      <LoadingSpinner 
        message={`Processing contracts... ${progress}%`}
        size="lg"
      />
    )}
  </div>
);
```

## Accessibility Features

- **ARIA Live Region**: Uses `aria-live="polite"` for screen readers
- **Role**: Proper `role="status"` for assistive technologies
- **Screen Reader Text**: Hidden text for screen readers via `sr-only` class
- **Focus Management**: SVG is marked as `aria-hidden` and `focusable="false"`

## Styling Customization

### Custom Colors

```tsx
// Using Tailwind classes
<LoadingSpinner color="text-blue-600" />
<LoadingSpinner color="text-green-500" />
<LoadingSpinner color="text-purple-400" />

// Using custom CSS classes
<LoadingSpinner color="my-custom-color" />
```

### Custom Sizes

```tsx
// Using predefined sizes
<LoadingSpinner size="sm" />
<LoadingSpinner size="md" />
<LoadingSpinner size="lg" />
<LoadingSpinner size="xl" />

// Using custom pixel values
<LoadingSpinner size={100} />
<LoadingSpinner size={24} />
```

### Custom Containers

```tsx
// Full container (default)
<LoadingSpinner message="Loading..." />

// Inline container
<LoadingSpinner size="sm" inline />

// Custom container with additional classes
<LoadingSpinner 
  className="bg-gray-100 p-4 rounded-lg" 
  message="Processing..."
/>
```

## Best Practices

1. **Use Appropriate Sizes**: 
   - `sm` for buttons and inline elements
   - `md` for general content areas
   - `lg` for modals and important actions
   - `xl` for page-level loading

2. **Provide Context**: Always include a `message` prop for better UX

3. **Consistent Colors**: Use your app's color scheme consistently

4. **Accessibility**: The component handles accessibility automatically, but ensure your loading states are meaningful

5. **Performance**: Use loading states to prevent UI blocking during async operations

## Examples Files

- `loading-spinner-examples.tsx` - Comprehensive usage examples
- `loading-spinner-integration-examples.tsx` - Integration with existing app components

## Dependencies

- React 18+
- Tailwind CSS
- `@/lib/utils` (for `cn` utility function)

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- IE11+ (with appropriate polyfills) 