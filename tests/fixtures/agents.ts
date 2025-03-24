import { CONTEXT } from "$lib/server/common/account/account.type";

export const mockAgents = {
  dev: {
    id: "m8gqdgubmqz91h21kh0n1hs7",
    db: "m8gqdgubmqz91h21kh0n1hs7",
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
    id: "m34n2ih47rdb5ovwodg8jih7",
    db: "m34n2ih47rdb5ovwodg8jih7",
    ns: "user",
    tk: "tokenone",
    region: "insouth",
    iat: 1733282501,
    exp: 1735874501,
    audience: "web.memotron.app",
    issuer: "21n.live",
    aud: "web.memotron.app",
    iss: "21n.live",
    context: CONTEXT.USER
  }
} as const;
