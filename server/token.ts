import { MemberRole } from "./types/account.type";

const jwt = require("jsonwebtoken");

export async function generateUserToken(props: {
  id: string;
  region: string;
  expiration?: number;
}) {
  const payload = {
    id: props.id,
    db: props.id,
    ns: process.env.USER_NS,
    tk: process.env.TOKEN_NAME,
    region: props.region ?? "global",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (props.expiration ?? 600 * 60),
    audience: process.env.TIDY_SUBATOM,
    issuer: process.env.TIDY_SUBATOM
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
}) {
  const expiration = 60 * 60 * 24 * 30;
  const payload = {
    id: props.principal,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiration,
    audience: process.env.TIDY_SUBATOM,
    issuer: process.env.TIDY_SUBATOM,
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

export async function validateToken(token) {
  try {
    const decoded = jwt.verify(
      token,
      process.env.TOKEN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      {
        algorithms: ["RS384"],
        audience: process.env.TIDY_SUBATOM,
        issuer: process.env.TIDY_SUBATOM,
        keyid: process.env.TOKEN_NAME
      }
    );
    console.log({ decoded });
    if (decoded.exp < Math.floor(Date.now() / 1000)) return false;
    else return decoded;
  } catch (err) {
    console.log({ err });
    return false;
  }
}
