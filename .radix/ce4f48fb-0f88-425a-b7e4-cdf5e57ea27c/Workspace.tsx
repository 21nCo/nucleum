import React from "react";

import { Message, ToolCall } from "../components/session.tsx";

const SESSION = "ce4f48fb-0f88-425a-b7e4-cdf5e57ea27c";

export default function Workspace() {
  return (
    <div>
      <Message session={SESSION} id="eaa7487e-1328-4f1f-b9a8-33fd911f5cf6" />
      <Message session={SESSION} id="fd1304e0-b2f2-4252-a9ae-af638998b888" />
    </div>
  );
}
