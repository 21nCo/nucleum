import React from "react";

import { Autosize } from "./textarea.tsx";
import { useComponentState } from "./state.tsx";

export function Code({ id }: { id: string }) {
  const [code, setCode, selectable] = useComponentState(id, "");

  return (
    <div className="my-2" {...selectable}>
      <Autosize
        className="bg-muted/60 font-mono text-xs"
        placeholder="Code"
        spellCheck={false}
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
    </div>
  );
}
