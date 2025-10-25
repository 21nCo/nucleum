import { MemberRole } from "../account/account.type";

const jwt = require("jsonwebtoken");

export async function generateUserToken(props: {
  id: string;
  region: string;
  expiration?: number;
  host?: string;
}) {
  const payload = {
    id: props.id,
    db: props.id,
    ns: process.env.USER_NS,
    tk: process.env.TOKEN_NAME,
    region: props.region ?? "global",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (props.expiration ?? 600 * 60),
    audience: props.host ?? "blank",
    issuer: process.env.DOMAIN
  };

  const header = {
    algorithm: "RS384",
    keyid: process.env.TOKEN_NAME
  };
  let token = jwt.sign(
    payload,
    process.env.TOKEN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    {
      algorithm: header.algorithm,
      audience: payload.audience,
      issuer: payload.issuer,
      keyid: header.keyid
    }
  );
  return token;
}

export async function generateSpaceToken(props: {
  database: string;
  principal: string;
  role: MemberRole;
  region?: string;
  host?: string;
}) {
  const expiration = 60 * 60 * 24 * 30;
  const payload = {
    id: props.principal,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiration,
    audience: props.host ?? "blank",
    issuer: process.env.DOMAIN,
    ns: process.env.SPACE_NS,
    db: props.database,
    tk: process.env.TOKEN_NAME,
    context: "SPACE",
    role: props.role,
    region: props.region ?? "global"
  };

  const header = {
    algorithm: "RS384",
    keyid: process.env.TOKEN_NAME
  };
  let token = jwt.sign(
    payload,
    process.env.TOKEN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    {
      algorithm: header.algorithm,
      audience: payload.audience,
      issuer: payload.issuer,
      keyid: header.keyid
    }
  );
  return token;
}

export async function validateToken(props: { token: string; host?: string }) {
  const verificationKey = process.env.TOKEN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!verificationKey) {
    return false;
  }

  try {
    const decoded = jwt.verify(props.token, verificationKey, {
      algorithms: ["RS384"],
      issuer: process.env.DOMAIN,
      audience: props.host ?? "blank"
    });

    if (typeof decoded === "object" && decoded !== null) {
      const payload = decoded as Record<string, any>;
      if (
        typeof payload.exp === "number" &&
        payload.exp < Math.floor(Date.now() / 1000)
      ) {
        return false;
      }
    }

    return decoded;
  } catch {
    return false;
  }
}
