import * as React from "react";
import { cn } from "@/lib/utils";

type ShimmerButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function ShimmerButton({
  className,
  children,
  type = "button",
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-md border border-border bg-foreground px-4 py-2 text-sm font-medium text-background shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 [animation:shimmer_2.2s_infinite]"
      />
    </button>
  );
}
