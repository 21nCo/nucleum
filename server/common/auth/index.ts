import { Agent } from "../account/account.type";
import { log } from "$lib/server/logger";
import { performQueryOnMasterDb } from "$lib/server/surrealHelpers";
import { frameNonSensitiveUserInfo } from "../account/account.utils";
import { generateUserToken, validateToken } from "./auth.utils";

export function authorize(props: { token: string; host?: string }) {
  try {
    //TODO - additional security checks
    const key = process.env.TOKEN_PRIVATE_KEY;
    if (!props.token || !key) return false;
    const decoded = validateToken(props);
    return decoded;
  } catch (err) {
    console.log(err);
    return false;
  }
}

/**
 * Signs in a user with email and password.
 * @param body email and pass
 * @returns
 */
export async function refreshToken(body: any, agent: Agent) {
  const { context } = body;
  const { id } = agent;
  const query = `LET $user = SELECT * FROM user WHERE meta::id(id) is "${id}"; IF count($user) == 1 THEN (SELECT * FROM $user) ELSE (RETURN count($user)) END`;
  const response = await performQueryOnMasterDb(query);
  if (response?.[1]?.result?.[0]) {
    const userInfo = response[1].result[0];
    const userId = userInfo.id.split("user:")[1];
    await log(userId, { id, activity: "refreshToken" });
    return await generateToken(userId, userInfo, {
      isTrusted: true,
      host: context?.host
    });
  } else {
    return response?.[1].result;
  }
}

export async function generateToken(
  userId,
  userInfo,
  params: { isTrusted?: boolean; isSignup?: boolean; host?: string } = {
    isTrusted: false,
    isSignup: false,
    host: "blank"
  }
) {
  const nonSensitiveUserInfo = frameNonSensitiveUserInfo(userInfo);
  const tokenExpiration = params.isTrusted ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
  const isUseThirdPartyAuthMethod = process.env.USE_THIRDPARTY_AUTH_METHOD;
  if (isUseThirdPartyAuthMethod == "true") {
    const token = await generateUserToken({
      id: userId,
      region: userInfo.region,
      expiration: tokenExpiration,
      host: params.host
    });
    return {
      userInfo: nonSensitiveUserInfo,
      token,
      isSignup: params.isSignup ?? false
    };
  } else {
    let token;
    // if (params.isSignup) {
    //   token = await signupSystemUser(userId, userInfo.passhash);
    // } else {
    //   token = await signinSystemUser(userId, userInfo.passhash);
    // }
    return {
      userInfo: nonSensitiveUserInfo,
      token,
      isSignup: params.isSignup ?? false
    };
  }
}
