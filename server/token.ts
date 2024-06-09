import { MemberRole } from "./types/account.type";

const jwt = require("jsonwebtoken");

export async function generateRefreshToken(database, expiration = 600 * 60) {
  //TODO - refresh token full implementation
  return generateUserToken(database, expiration * 2);
}

export async function generateUserToken(database, expiration = 600 * 60) {
  const payload = {
    id: database,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiration,
    audience: process.env.TIDY_SUBATOM,
    issuer: process.env.TIDY_SUBATOM,
    ns: process.env.USER_NS,
    db: database,
    tk: process.env.TIDY_TOKEN_KEY,
  };

  const header = {
    algorithm: "RS384",
    keyid: process.env.TIDY_TOKEN_KEY,
  };
  // console.log(
  //   "key that's being used",
  //   process.env.TOKEN_PRIVATE_KEY.replace(/\\n/g, "\n")
  // );
  let token = jwt.sign(
    payload,
    process.env.TOKEN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    {
      algorithm: header.algorithm,
      audience: payload.audience,
      issuer: payload.issuer,
      keyid: header.keyid,
    }
  );
  return token;
}

export async function generateSpaceToken(
  database: string,
  principal: string,
  role: MemberRole
) {
  const expiration = 60 * 60 * 24 * 30;
  const payload = {
    id: principal,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiration,
    audience: process.env.TIDY_SUBATOM,
    issuer: process.env.TIDY_SUBATOM,
    ns: process.env.SPACE_NS,
    db: database,
    tk: process.env.TIDY_TOKEN_KEY,
    context: "SPACE",
    role,
  };

  const header = {
    algorithm: "RS384",
    keyid: process.env.TIDY_TOKEN_KEY,
  };
  let token = jwt.sign(
    payload,
    process.env.TOKEN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    {
      algorithm: header.algorithm,
      audience: payload.audience,
      issuer: payload.issuer,
      keyid: header.keyid,
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
        keyid: process.env.TIDY_TOKEN_KEY,
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
