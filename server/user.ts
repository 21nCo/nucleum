import { processOAuth } from "./oauthUtil";
import { log } from "./logger";
import { performAdminQuery, performScopeQuery } from "./surrealHelpers";
import { Agent, CONTEXT } from "./types/account.type";
import {
  fetchDbDefinitionsQuery,
  initializeDatabaseAndDefinitions,
  updateDbChangeRunStatus,
} from "./account";
import { generateRefreshToken, generateUserToken } from "./token";
import { retrieveAppData } from "./utils";

function frameNonSensitiveUserInfo(userInfo: {
  id: any;
  emailParts: any;
  nickName: any;
  profilePictureUrl: any;
  joinDate: any;
}) {
  const { id, emailParts, nickName, profilePictureUrl, joinDate } = userInfo;
  return {
    id,
    emailParts,
    nickName,
    profilePictureUrl,
    joinDate,
  };
}

export async function generateToken(
  userId,
  userInfo,
  params: { isTrusted?: boolean; isSignup?: boolean } = {
    isTrusted: false,
    isSignup: false,
  }
) {
  const nonSensitiveUserInfo = frameNonSensitiveUserInfo(userInfo);
  const tokenExpiration = params.isTrusted ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
  const refreshToken = await generateRefreshToken(userId, tokenExpiration);
  const isUseThirdPartyAuthMethod = process.env.USE_THIRDPARTY_AUTH_METHOD;
  if (isUseThirdPartyAuthMethod == "true") {
    const token = await generateUserToken(userId, tokenExpiration);
    return {
      userInfo: nonSensitiveUserInfo,
      token,
      refreshToken,
      isSignup: params.isSignup ?? false,
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
      refreshToken,
      isSignup: params.isSignup ?? false,
    };
  }
}

export async function signup(data: any, isOAuth = false) {
  console.log("signup", { data, isOAuth });
  const { email, pass, nickName, profilePictureUrl, isTrusted, sub, context } =
    data;
  const emailParts = getEmailParts(email);
  const joinDate = new Date().toISOString();
  let query: string;
  if (isOAuth) {
    query = `LET $user = SELECT * FROM user WHERE emailhash = crypto::md5("${email}"); IF count($user) == 0 THEN (CREATE user SET emailhash = crypto::md5("${email}"), emailParts = ${JSON.stringify(
      emailParts
    )}, nickName = "${nickName}", oAuthId = "${sub}", isOAuth = true, profilePictureUrl = "${profilePictureUrl}", joinDate = "${joinDate}", context = ${JSON.stringify(
      context
    )}) ELSE (RETURN {userCount: count($user), user: $user}) END`;
  } else {
    query = `LET $user = SELECT * FROM user WHERE emailhash = crypto::md5("${email}"); IF count($user) == 0 THEN (CREATE user SET emailhash = crypto::md5("${email}"), pass = crypto::argon2::generate("${pass}"), passhash = crypto::md5("${pass}"), emailParts = ${JSON.stringify(
      emailParts
    )}, nickName = "${nickName}", profilePictureUrl = "${profilePictureUrl}", joinDate = "${joinDate}", context = ${JSON.stringify(
      context
    )}) ELSE (RETURN {userCount: count($user), user: $user}) END`;
  }
  const response = await performAdminQuery(query);
  console.log("signup resp:", {
    response,
    responseone: JSON.stringify(response[1]),
  });
  if (response?.[1]?.result && response[1].result.userCount === undefined) {
    console.log("new user created, logging in");
    const userInfo = response[1].result[0];
    const userId = userInfo.id.split("user:")[1];
    await log(userId, { ...context, activity: "signup" });
    await initializeDatabaseAndDefinitions(userId, CONTEXT.USER, context.host);
    return await generateToken(userId, userInfo, { isTrusted, isSignup: true });
  } else if (isOAuth && response?.[1].result.userCount === 1) {
    console.log("user already exists for OAuth, logging in");
    const userInfo = response[1].result.user[0];
    const userId = userInfo.id.split("user:")[1];
    await log(userId, { ...context, activity: "signinoauth" });
    return await generateToken(userId, userInfo, { isTrusted });
  } else {
    console.log("Non OAuth user already exists, returning non outh user count");
    await log("none", {
      ...context,
      activity: "signupattempt",
      error: "user already exists",
      email,
    });
    return response?.[1].result.userCount;
  }
}

/**
 * Signs in a user with email and password.
 * @param body email and pass
 * @returns
 */
export async function signin(body: any) {
  const { email, pass, isTrusted, context } = body;
  if (!email || !pass) return { error: "email and pass are required" };
  const query = `LET $user = SELECT * FROM user WHERE emailhash = crypto::md5("${email}"); IF count($user) == 1 AND crypto::argon2::compare($user[0].pass,"${pass}") THEN (SELECT * FROM $user) ELSE IF count($user) == 1 THEN (RETURN -1) ELSE (RETURN count($user)) END`;
  const response = await performAdminQuery(query);
  if (response?.[1]?.result?.[0]) {
    const userInfo = response[1].result[0];
    const userId = userInfo.id.split("user:")[1];
    await log(userId, { ...context, activity: "signin" });
    //await updateDbDefinitions(userId, userInfo.lastRunChangeId);
    return await generateToken(userId, userInfo, { isTrusted });
  } else {
    return response?.[1].result;
  }
}

/**
 * Signs in a user with email and password.
 * @param body email and pass
 * @returns
 */
export async function refreshToken(agent: Agent) {
  const { id } = agent;
  const query = `LET $user = SELECT * FROM user WHERE meta::id(id) is "${id}"; IF count($user) == 1 THEN (SELECT * FROM $user) ELSE (RETURN count($user)) END`;
  const response = await performAdminQuery(query);
  if (response?.[1]?.result?.[0]) {
    const userInfo = response[1].result[0];
    const userId = userInfo.id.split("user:")[1];
    await log(userId, { id, activity: "refreshToken" });
    return await generateToken(userId, userInfo, { isTrusted: true });
  } else {
    return response?.[1].result;
  }
}

/**
 * Processes the OAuth response (auth code) received from the OAuth provider, determines the user details using futher id API call or parsing the id_token and signs in or signs up the user.
 * @param body code: auth code received from the provider, app, slug, context
 * @returns user details and token
 */
export async function oauth(body: any) {
  const { code, app, slug, context } = body;
  console.log({ code, app, slug });
  if (!code || !app || !slug)
    return { error: "code, app and slug are required" };
  let config;
  let appDataJson = await retrieveAppData({ app });
  console.log({ appDataJson });
  config = appDataJson?.oAuthConfig?.find((c) => c.oauth_slug === slug);
  if (!config) {
    return { error: "Unknown provider" };
  }
  const redirectUri = context.href.split("?")[0];
  if (!code) return { error: "code is required" };
  if (!redirectUri) return { error: "Unable to resolve Redirect URL" };
  const oAuthUserData = await processOAuth(slug, config, code, redirectUri);
  console.log({ oAuthUserData });
  if (config.oauth_slug === "google" || config.oauth_slug === "apple") {
    return await signup(
      {
        email: oAuthUserData.email,
        nickName: oAuthUserData.name,
        profilePictureUrl: oAuthUserData.picture,
        sub: oAuthUserData.sub,
        context,
        isTrusted: true,
      },
      true
    );
  }
}

/**
 * OAuth redirect handler to process the auth code received from the OAuth provider if the response type of the provider is `form_post` in cases like Apple.
 * @param body
 * @param provider
 * @param apiUrl
 * @returns
 */
export async function oauthRedirect(
  body: any,
  provider: string,
  apiUrl: string
) {
  console.log("oauthRedirect", { body, provider });
  try {
    return oauth({
      code: body.code,
      app: body.state,
      slug: provider,
      context: {
        href: "https://" + apiUrl + "/oauth/" + provider,
        host: body.state,
      },
    });
  } catch (e) {
    console.error(e);
    return { provider, status: "error", error: e };
  }
}

export function getEmailParts(email: string) {
  const emailParts = email.split("@");
  const emailName = emailParts[0];
  const characterCount = emailName.length;
  let snapLength = 3;
  if (characterCount <= snapLength * 2) snapLength = 2;
  if (characterCount <= snapLength * 2) snapLength = 1;
  const firstFew = emailName.substring(0, snapLength);
  const lastFew = emailName.substring(emailName.length - snapLength);
  const emailDomain = emailParts[1];
  return {
    characterCount,
    firstFew,
    lastFew,
    emailDomain,
  };
}

/**
 * Deprecated - Use fetchDbDefinitionsQuery instead
 * @param userId
 * @param isIncludeTables
 * @returns
 */
export async function runDefinitionScripts(userId, isIncludeTables = false) {
  console.log("Running db object definitions script", { userId });
  if (!userId) return { error: "userId is required" };
  const app = process.env.TIDY_SUBATOM ?? "";
  const query = `return fn::admin::dbObjectDefinitions("${app.toLowerCase()}", ${isIncludeTables})`;
  const response = await performAdminQuery(query);
  const queryAray = response[0].result;
  const definitions = queryAray.join(";");
  return await performScopeQuery(definitions, userId);
}

export async function deleteUserAccount(body: any, agent: Agent) {
  const { id, context } = body;
  if (!agent.id) return { error: "userId is required" };
  await log(agent.id, { ...context, activity: "deleteAccount" });
  const query = `DELETE user WHERE id = "${id}";`;
  const response = await performAdminQuery(query);
  const dbRemovalQuery = `USE NAMESPACE ${process.env.USER_NS}; REMOVE DATABASE ${agent.id};`;
  await performAdminQuery(dbRemovalQuery);
  return response;
}

export async function performQueryOnBehalfOfUser(query: string, agent: Agent) {
  //TODO - check if the agent has permissions to perform the query if the context is space
  return performScopeQuery(query, agent);
}
