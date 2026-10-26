import React, { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.tsx";
import { Icon } from "./Icon.tsx";
import { useStore } from "./state.tsx";

// What the user can add. Each name is a file under .radix/components, which is
// what the server looks for when it writes the component into the workspace.
const BLOCKS = [
  { name: "Text", icon: "text-align-left", description: "A paragraph of writing" },
  { name: "Checkbox", icon: "checkmark-square-02", description: "A thing to tick off" },
  { name: "Code", icon: "source-code", description: "A block of code" },
  { name: "Diagram", icon: "flowchart", description: "Shapes and lines to draw" },
];

// The menu opens where it was clicked rather than below the whole trigger.
// Opened from the keyboard, there is no point and it falls back to the trigger.
function usePoint() {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const anchor = point
    ? { getBoundingClientRect: () => new DOMRect(point.x, point.y, 0, 0) }
    : undefined;

  return {
    anchor,
    clear: () => setPoint(null),
    press: (event: React.PointerEvent) => setPoint({ x: event.clientX, y: event.clientY }),
  };
}

// Choosing a block writes it into the workspace: the file changes on disk, so
// the page rebuilds and the block appears. Without before, it goes at the end.
function Blocks({ workspace, before }: { workspace: string; before?: string }) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Add</DropdownMenuLabel>
      {BLOCKS.map((block) => (
        <DropdownMenuItem key={block.name} onClick={() => radix.add(workspace, block.name, before)}>
          <span className="flex size-6 shrink-0 items-center justify-center rounded-sm border border-border">
            <Icon name={block.icon} className="size-3.5" />
          </span>
          <span className="flex flex-col">
            <span>{block.name}</span>
            <span className="text-xs text-muted-foreground">{block.description}</span>
          </span>
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  );
}

// The empty space below a workspace's content.
export function AddMenu({ workspace }: { workspace: string }) {
  const { anchor, clear, press } = usePoint();

  return (
    <DropdownMenu onOpenChange={(open) => !open && clear()}>
      <DropdownMenuTrigger
        className="group flex min-h-24 w-full cursor-pointer items-start pt-3 text-left outline-none"
        onPointerDown={press}
      >
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-aria-expanded:opacity-100">
          <Icon name="plus-sign" className="size-3.5" />
          Add a block
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" anchor={anchor}>
        <Blocks workspace={workspace} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// The loader puts one of these above each element at the top of a workspace
// (see web/loader.js). It takes no height, so the page lays out as before, and
// a thin strip over the gap shows a line when hovered.
export function InsertPoint({ before }: { before: string }) {
  const { workspace } = useStore();
  const { anchor, clear, press } = usePoint();

  return (
    <div className="relative h-0">
      <DropdownMenu onOpenChange={(open) => !open && clear()}>
        <DropdownMenuTrigger
          aria-label="Add a block here"
          className="group absolute inset-x-0 -top-1.5 z-10 flex h-3 cursor-pointer items-center outline-none"
          onPointerDown={press}
        >
          <span className="h-px w-full bg-border opacity-0 transition-opacity group-hover:opacity-100 group-aria-expanded:opacity-100" />
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-64" anchor={anchor}>
          <Blocks workspace={workspace} before={before} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
