import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border-[1.5px] border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] transition-shadow",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#111827]",
          "placeholder:text-[#9CA3AF]",
          "focus-visible:outline-none focus-visible:border-[#1E40AF] focus-visible:ring-[3px] focus-visible:ring-[#1E40AF]/15",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F9FAFB]",
          "md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
