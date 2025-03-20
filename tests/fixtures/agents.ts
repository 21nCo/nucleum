import { CONTEXT } from "$lib/server/common/account/account.type";

export const mockAgents = {
  dev: {
    id: "m5wmpwymz7ofcy7m6q0ymja3",
    db: "m5wmpwymz7ofcy7m6q0ymja3",
    ns: "user",
    tk: "tokenone",
    region: "insouth",
    iat: 1733282501,
    exp: 1735874501,
    audience: "memotron.tidigit.dev",
    issuer: "tidigit.dev",
    aud: "memotron.tidigit.dev",
    iss: "tidigit.dev",
    context: CONTEXT.USER
  },
  pre: {
    id: "pre-agent",
    context: CONTEXT.USER
  },
  live: {
    id: "live-agent",
    context: CONTEXT.USER
  }
} as const;
