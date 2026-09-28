import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva('inline-flex items-center justify-center gap-2 max-w-full whitespace-normal text-center [&_svg]:shrink-0 rounded-lg text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: { default: 'bg-primary text-white shadow-sm hover:bg-blue-700', outline: 'border border-border bg-card text-foreground hover:bg-muted', ghost: 'text-foreground hover:bg-muted', destructive: 'bg-red-600 text-white hover:bg-red-700' },
    size: { default: 'min-h-11 sm:min-h-10 px-4 py-2', sm: 'min-h-11 sm:min-h-8 px-3 text-xs', icon: 'h-11 w-11 shrink-0 sm:h-9 sm:w-9' }
  }, defaultVariants: { variant: 'default', size: 'default' }
});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({className,variant,size,asChild=false,...props},ref) => {
  const Component = asChild ? Slot.Root : 'button';
  return <Component className={cn(buttonVariants({variant,size,className}))} ref={ref} {...props}/>;
});
Button.displayName = 'Button';

