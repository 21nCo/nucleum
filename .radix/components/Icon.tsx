import React from "react";

import { cn } from "./ui/cn.ts";

// One symbol out of the Hugeicons sprite in web/. Size comes from a class, so a
// component can set it the way the rest of its styling is set.
export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={cn("size-4 shrink-0", className)} aria-hidden="true">
      <use href={"/hugeicons-sprite.svg#" + name} />
    </svg>
  );
}
