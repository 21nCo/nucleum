import React from "react";

import { Autosize } from "./textarea.tsx";
import { useComponentState } from "./state.tsx";

export function Text({ id }: { id: string }) {
  const [text, setText, selectable] = useComponentState(id, "");

  return (
    <Autosize
      className="border-transparent bg-transparent px-0 text-sm/relaxed focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
      placeholder="Write something"
      value={text}
      onChange={(event) => setText(event.target.value)}
      {...selectable}
    />
  );
}
