import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-blue-600/20 text-blue-400 border border-blue-600/30",
        secondary: "bg-gray-700 text-gray-300",
        destructive: "bg-red-600/20 text-red-400 border border-red-600/30",
        outline: "border border-[#2a3547] text-gray-400",
        success: "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30",
        warning: "bg-amber-600/20 text-amber-400 border border-amber-600/30",
        purple: "bg-purple-600/20 text-purple-400 border border-purple-600/30",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
