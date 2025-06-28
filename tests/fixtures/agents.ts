import { CONTEXT } from "$lib/server/common/account/account.type";

export const mockAgents = {
  dev: {
    id: "mc0lsom5c7jd8e7gkyu7g4kw",
    db: "mc0lsom5c7jd8e7gkyu7g4kw",
    ns: "user",
    tk: "tokenone",
    region: "insouth",
    iat: 1733282501,
    exp: 1735874501,
    audience: "dev.memotron.app",
    issuer: "21n.dev",
    aud: "dev.memotron.app",
    iss: "21n.dev",
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
