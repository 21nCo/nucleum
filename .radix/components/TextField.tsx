import React from "react";

import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";
import { useComponentState } from "./state.tsx";

export function TextField({ id, label }: { id: string; label: string }) {
  const [text, setText, selectable] = useComponentState(id, "");

  return (
    <div className="my-2 flex flex-col gap-1.5" {...selectable}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={text} onChange={(event) => setText(event.target.value)} />
    </div>
  );
}
