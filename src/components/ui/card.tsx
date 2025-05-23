import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-white rounded-xl shadow-lg border border-slate-200 p-6',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export { Card }; 