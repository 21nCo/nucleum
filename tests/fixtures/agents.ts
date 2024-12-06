import { CONTEXT } from "$lib/server/types/account.type";

export const mockAgents = {
  dev: {
    id: "m3hb3a4gf6jxl0kkqisq6n5i",
    db: "m3hb3a4gf6jxl0kkqisq6n5i",
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
