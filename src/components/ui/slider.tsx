import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

export interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
}

export const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  (
    { className, value, min = 0, max = 1, step = 0.01, onValueChange, ...props },
    ref
  ) => (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        'relative flex w-full touch-none select-none items-center',
        className
      )}
      min={min}
      max={max}
      step={step}
      value={value}
      onValueChange={onValueChange}
      {...props}
    >
      <SliderPrimitive.Track className="bg-gray-200 relative h-2 w-full grow rounded-full">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-blue-500" />
      </SliderPrimitive.Track>
      {Array.isArray(value) && value.length === 2 ? (
        <>
          <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-blue-500 bg-white shadow transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-blue-500 bg-white shadow transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </>
      ) : (
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-blue-500 bg-white shadow transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400" />
      )}
    </SliderPrimitive.Root>
  )
);
Slider.displayName = 'Slider'; 