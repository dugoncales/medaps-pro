import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#1E40AF]/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#1E40AF] text-white hover:bg-[#1E3A8A] shadow-[0_1px_2px_0_rgba(30,64,175,0.15)]",
        destructive:
          "bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-[0_1px_2px_0_rgba(220,38,38,0.15)]",
        outline:
          "border-[1.5px] border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F9FAFB] hover:border-[#D1D5DB]",
        secondary:
          "bg-[#F9FAFB] text-[#111827] border-[1.5px] border-[#E5E7EB] hover:bg-[#F3F4F6]",
        ghost:
          "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]",
        link:
          "text-[#1E40AF] underline-offset-4 hover:underline hover:text-[#1E3A8A]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
