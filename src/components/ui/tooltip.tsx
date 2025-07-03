import * as React from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';

export const TooltipProvider = RadixTooltip.Provider;
export const Tooltip = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof RadixTooltip.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTooltip.Content>
>(({ className, side = 'top', align = 'center', ...props }, ref) => (
  <RadixTooltip.Content
    ref={ref}
    side={side}
    align={align}
    className={
      'z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md animate-fade-in ' +
      (className || '')
    }
    {...props}
  />
));
TooltipContent.displayName = 'TooltipContent'; 