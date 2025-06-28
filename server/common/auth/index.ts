import { Agent } from "../account/account.type";
import { log } from "$lib/server/logger";
import { DatabaseProviderFactory } from "$lib/server/database/providers";
import { frameNonSensitiveUserInfo } from "../account/account.utils";
import { generateUserToken, validateToken } from "./auth.utils";
import { IUserProfileInfo } from "$lib/shared/types/account.type";

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
  const provider = DatabaseProviderFactory.getProvider();
  const response = await provider.getUserById(id);
  if (response && !Array.isArray(response) && response.id) {
    const userId = response.id.split("user:")[1];
    await log(userId, { id, activity: "refreshToken" });
    return await generateToken(userId, response, {
      isTrusted: true,
      host: context?.host
    });
  } else {
    return response;
  }
}

export async function generateToken(
  userId: string,
  userInfo: IUserProfileInfo,
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
