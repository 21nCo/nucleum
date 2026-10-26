import React from "react";

import { Message, ToolCall } from "../components/session.tsx";

const SESSION = "c5639976-0e2b-4ea3-b94c-430a56c1cc17";

export default function Workspace() {
  return (
    <div>
      <Message session={SESSION} id="190fd109-9a35-48f0-802d-c1a52d659ef8" />
      <Message session={SESSION} id="2c94fbab-e7ea-47f8-a965-fd6a2edcfc07" />
    </div>
  );
}
