import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Command as CommandPrimitive,
  CommandInput as CommandInputPrimitive,
  CommandList as CommandListPrimitive,
  CommandEmpty as CommandEmptyPrimitive,
  CommandGroup as CommandGroupPrimitive,
  CommandItem as CommandItemPrimitive,
  CommandSeparator as CommandSeparatorPrimitive,
  CommandDialog as CommandDialogPrimitive,
} from "cmdk"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

const CommandDialog = ({ className, ...props }: React.ComponentProps<typeof CommandDialogPrimitive>) => (
  <CommandDialogPrimitive
    className={cn("overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg", className)}
    {...props}
  />
)

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandInputPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandInputPrimitive>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <CommandInputPrimitive
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
))
CommandInput.displayName = CommandInputPrimitive.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandListPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandListPrimitive>
>(({ className, ...props }, ref) => (
  <CommandListPrimitive
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))
CommandList.displayName = CommandListPrimitive.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandEmptyPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandEmptyPrimitive>
>(({ className, ...props }, ref) => (
  <CommandEmptyPrimitive
    ref={ref}
    className={cn("py-6 text-center text-sm", className)}
    {...props}
  />
))
CommandEmpty.displayName = CommandEmptyPrimitive.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandGroupPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandGroupPrimitive>
>(({ className, ...props }, ref) => (
  <CommandGroupPrimitive
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
))
CommandGroup.displayName = CommandGroupPrimitive.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandSeparatorPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandSeparatorPrimitive>
>(({ className, ...props }, ref) => (
  <CommandSeparatorPrimitive
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandSeparatorPrimitive.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandItemPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandItemPrimitive>
>(({ className, ...props }, ref) => (
  <CommandItemPrimitive
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  />
))
CommandItem.displayName = CommandItemPrimitive.displayName

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} 