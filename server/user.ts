import { fetchOAuthUserData, parseOAuthUserDataForApple } from "./oauthUtil";
import { log } from "./logger";
import {
  performQueryOnMasterDb,
  performQueryOnRegionalDb,
  performAgentProxyQuery
} from "./surrealHelpers";
import { Agent, CONTEXT } from "./types/account.type";
import { generateUserToken } from "./token";
import { retrieveAppConfig } from "./utils";
import { OAuthUserData } from "./types/oauth.type";
import { authorize, initializeDatabase } from "./account";
import { accessControlHeaders } from "./lambda";
import {
  resolveInsertQuery,
  resolveMutationQueryV2
} from "$lib/shared/utils/surreal.utils";
import { SyncMethod } from "$lib/shared/types/sync.type";

function frameNonSensitiveUserInfo(userInfo: {
  id: any;
  emailParts: any;
  nickName: any;
  profilePictureUrl: any;
  joinDate: any;
  region: string;
  isBootstrapped: boolean;
}) {
  const {
    id,
    emailParts,
    nickName,
    profilePictureUrl,
    joinDate,
    region,
    isBootstrapped
  } = userInfo;
  return {
    id,
    emailParts,
    nickName,
    profilePictureUrl,
    joinDate,
    region,
    isBootstrapped
  };
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

const betaProducts = ["app.memotron.io", "pre.memotron.io", "tidigit.com"];

export async function signup(data: any, isOAuth = false) {
  console.log("signup", { data, isOAuth });
  const { email, pass, nickName, profilePictureUrl, isTrusted, sub, context } =
    data;
  if (betaProducts.includes(context.app)) {
    const query = `SELECT * from betaList where email is "${email}" and product is "${context.app}"`;
    const response = await performQueryOnMasterDb(query);
    const val = response?.[0]?.result;
    console.log({ at: "beta list response", response, val });
    if (!val || val?.length === 0) {
      return { error: "You are not in the beta list for this product" };
    }
  }
  const emailParts = getEmailParts(email);
  const joinDate = new Date().toISOString();
  let query: string;
  if (isOAuth) {
    query = `LET $user = SELECT * FROM user WHERE emailhash = crypto::md5("${email}"); IF count($user) == 0 THEN (CREATE user SET emailhash = crypto::md5("${email}"), id = "${
      context.guest
    }", emailParts = ${JSON.stringify(
      emailParts
    )}, nickName = "${nickName}", oAuthId = "${sub}", isOAuth = true, profilePictureUrl = "${profilePictureUrl}", joinDate = "${joinDate}", context = ${JSON.stringify(
      context
    )}) ELSE (RETURN {userCount: count($user), user: $user}) END`;
  } else {
    query = `LET $user = SELECT * FROM user WHERE emailhash = crypto::md5("${email}"); IF count($user) == 0 THEN (CREATE user SET emailhash = crypto::md5("${email}"), id = "${
      context.guest
    }",  pass = crypto::argon2::generate("${pass}"), passhash = crypto::md5("${pass}"), emailParts = ${JSON.stringify(
      emailParts
    )}, nickName = "${nickName}", profilePictureUrl = "${profilePictureUrl}", joinDate = "${joinDate}", context = ${JSON.stringify(
      context
    )}) ELSE (RETURN {userCount: count($user), user: $user}) END`;
  }
  const response = await performQueryOnMasterDb(query);
  if (response?.[1]?.result && response[1].result.userCount === undefined) {
    console.log("new user created, logging in");
    const userInfo = response[1].result[0];
    const userId = userInfo.id.split("user:")[1];
    await log(userId, { ...context, activity: "signup" });
    return await generateToken(userId, userInfo, {
      isTrusted,
      isSignup: true,
      host: context.host
    });
  } else if (isOAuth && response?.[1].result.userCount === 1) {
    console.log("user already exists for OAuth, logging in");
    const userInfo = response[1].result.user[0];
    const userId = userInfo.id.split("user:")[1];
    await log(userId, { ...context, activity: "signinoauth" });
    return await generateToken(userId, userInfo, {
      isTrusted,
      host: context.host
    });
  } else {
    console.log("Non OAuth user already exists, returning non outh user count");
    await log("none", {
      ...context,
      activity: "signupattempt",
      error: "user already exists",
      email
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
  const response = await performQueryOnMasterDb(query);
  if (response?.[1]?.result?.[0]) {
    const userInfo = response[1].result[0];
    const userId = userInfo.id.split("user:")[1];
    await log(userId, { ...context, activity: "signin" });
    return await generateToken(userId, userInfo, {
      isTrusted,
      host: context.host
    });
  } else {
    return response?.[1].result;
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

async function signinOauthUser(oAuthUserData: OAuthUserData, context: any) {
  return signup(
    {
      email: oAuthUserData.email,
      nickName: getNickName(),
      profilePictureUrl: oAuthUserData.picture,
      sub: oAuthUserData.sub,
      context: { ...context, oauthData: oAuthUserData },
      isTrusted: true
    },
    true
  );
  function getNickName() {
    if (oAuthUserData.name) {
      return oAuthUserData.name;
    }
    if (oAuthUserData.firstName && oAuthUserData.lastName) {
      return oAuthUserData.firstName + " " + oAuthUserData.lastName;
    }
    return oAuthUserData.given_name || "";
  }
}

/**
 * Processes the OAuth response (auth code) received from the OAuth provider, determines the user details using futher id API call or parsing the id_token and signs in or signs up the user.
 * @param body code: auth code received from the provider, app, slug, context
 * @returns user details and token
 */
export async function oauth(body: any) {
  try {
    const { code, app, slug, context } = body;
    console.log({ code, app, slug });
    if (!code || !app || !slug)
      return { error: "code, app and slug are required" };
    let config;
    let appDataJson = await retrieveAppConfig(app);
    config = appDataJson?.oAuthConfig?.find((c) => c.oauth_slug === slug);
    if (!config) {
      return { error: "Unknown provider" };
    }
    const redirectUri = context.href.split("?")[0];
    if (!code) return { error: "code is required" };
    if (!redirectUri) return { error: "Unable to resolve Redirect URL" };
    const oAuthUserData = await fetchOAuthUserData(config, code, redirectUri);
    if (
      config.oauth_slug === "google" ||
      (config.oauth_slug === "apple" && oAuthUserData)
    ) {
      return await signinOauthUser(oAuthUserData, context);
    }
  } catch (e) {
    console.error(e);
    return { status: "error", error: e };
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
  endpoint: string
) {
  const result = await _processOAuthRedirect(body, provider, endpoint);
  let domain = "";
  const domainPart = body.state.split(":")[1];
  if (domainPart) {
    if (domainPart.includes("localredirect.")) {
      domain = "tauri://localhost/index.html";
    } else {
      domain = "https://" + domainPart + "/oauth";
    }
  }
  console.log({ result, domainPart, domain, body });
  let redirectUrl = domain ?? "http://bla.ink";
  if (result?.token && domain) {
    redirectUrl =
      domain +
      "?token=" +
      result.token +
      "&provider=" +
      provider +
      "&signup=" +
      result.isSignup;
  } else if (result?.error) {
    redirectUrl = domain + "/error?error=" + result.error;
  }
  return {
    statusCode: 302,
    headers: {
      Location: redirectUrl
    },
    body: ""
  };
}

async function _processOAuthRedirect(
  body: any,
  provider: string,
  apiUrl: string
) {
  try {
    let app = "";
    if (!body.state) return;
    const guestPart = body.state.split(":")[0];
    const domainPart = body.state.split(":")[1];
    if (domainPart.includes("localredirect.")) {
      app = domainPart.split("localredirect.")[1];
    } else {
      app = domainPart;
    }
    const context = {
      href: "https://" + apiUrl + "/oauth/" + provider,
      state: body.state,
      host: domainPart,
      guest: guestPart,
      app
    };
    if (provider === "apple" && (body.id_token || body.user)) {
      if (body.user && typeof body.user === "string")
        body.user = JSON.parse(body.user);
      const oAuthUserData = parseOAuthUserDataForApple(body);
      if (!oAuthUserData?.email)
        return {
          provider,
          status: "error",
          error: "Unable to parse Apple user data"
        };
      return await signinOauthUser(oAuthUserData, context);
    } else if (body.code) {
      return oauth({
        code: body.code,
        app,
        slug: provider,
        context
      });
    }
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
    emailDomain
  };
}

export async function deleteUserAccount(body: any, agent: Agent) {
  const { context } = body;
  if (!agent.id) return { error: "userId is required" };
  await log(agent.id, { ...context, activity: "deleteAccount" });
  const query = `DELETE user WHERE meta::id(id) = "${agent.id}";`;
  const response = await performQueryOnMasterDb(query);
  const dbRemovalQuery = `USE NAMESPACE ${process.env.USER_NS}; REMOVE DATABASE ${agent.id};`;
  await performQueryOnRegionalDb(dbRemovalQuery, {
    region: agent.region,
    db: agent.id
  });
  return response;
}

export async function performQueryOnBehalfOfUser(query: string, agent: Agent) {
  //TODO - check if the agent has permissions to perform the query if the context is space
  return performAgentProxyQuery(query, agent);
}

export async function performUserAccountAction(authHeader: any, body: any) {
  const { id, region, action, context } = body;
  if (action === "guest") {
    const timestamp = new Date().toISOString();
    const query = `create guest set id = "${id}", timestamp = "${timestamp}", context = ${JSON.stringify(
      context
    )}; create activity set userId = "guest:${id}", timestamp = "${timestamp}", context = ${JSON.stringify(
      { ...context, action: "guest-visit" }
    )};`;
    const response = await performQueryOnMasterDb(query);
    if (response) return { id };
    else return { error: "Guest creation failed" };
  } else if (action === "bootstrap") {
    let token = authHeader?.split(" ")[1];
    let agent = await authorize({ token, host: context.host });
    if (!agent)
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "text/plain",
          ...accessControlHeaders
        },
        body: "Unauthorized"
      };
    const id = agent.id;
    const bootstrapResponse = await initializeDatabase(id, {
      scope: CONTEXT.USER,
      host: context.host,
      region
    });
    console.log("bootstrap response", { bootstrapResponse });
    const query = `update user:${id} set region = "${region}", isBootstrapped = true; select context.guest.* as guest from user:${id};`;
    const response = await performQueryOnMasterDb(query);
    console.log("bootstrap response", { response: JSON.stringify(response) });
    if (!response) return { error: "Bootstrapping failed" };
    const userInfo = response[0].result[0];
    const tzInfo = response[1]?.result?.[0]?.guest?.context?.timezone;
    console.log("tzInfo", tzInfo);
    if (tzInfo) {
      try {
        const tzQuery = `create tz set date = "${new Date(
          Date.UTC(1970, 0, 1)
        ).toISOString()}", offset = ${tzInfo.offset}, label = "${
          tzInfo.label
        }";`;
        const tzResponse = await performQueryOnBehalfOfUser(tzQuery, {
          db: id,
          context: CONTEXT.USER,
          id: id,
          region: region
        });
        console.log("tzResponse", tzResponse);
      } catch (e) {
        console.error("Error setting timezone", e);
      }
    }
    return await generateToken(id, userInfo, { isTrusted: true });
  }
}

/**
 * Syncs the user data from clients to the database
 * @param body
 * @param method
 * @returns
 */
export async function sync(body: any, agent: Agent, method: string) {
  console.log({ at: "sync", body, agent, method });
  try {
    const result = await _processSync(body, agent, method);
    console.log({ at: "sync - result", result, body, method });
    return result;
  } catch (e) {
    console.error({ at: "sync - error", error: e });
    return { error: "Sync failed" };
  }
}

/**
 *
 */
async function _processSync(body: any, agent: Agent, method: string) {
  if (method === SyncMethod.SYNC_UP) {
    const { mutations, lastSyncDown, resources, dapId } = body;
    if (!mutations || mutations.length < 1) {
      return { error: "No mutations to sync" };
    }
    const insertMutationsQuery = `INSERT INTO mutation ${JSON.stringify(
      mutations
    )};`;
    const individualMutationsQuery = mutations
      .map((mutation: any) => resolveMutationQueryV2(mutation))
      .join("; ");
    const fetchBackQuery = resolveSyncDownQuery(lastSyncDown, resources, dapId);
    const masterQuery = `${insertMutationsQuery}; ${individualMutationsQuery}; ${fetchBackQuery};`;
    const response = await performQueryOnBehalfOfUser(masterQuery, agent);
    console.log({ method, response });
    if (response) return response;
    else return { error: "transaction failed" };
  } else if (method === SyncMethod.SYNC_DOWN) {
    const { lastSyncDown, resources, dapId } = body;
    const fetchBackQuery = resolveSyncDownQuery(lastSyncDown, resources, dapId);
    if (!fetchBackQuery) return { error: "transaction failed" };
    const response = await performQueryOnBehalfOfUser(fetchBackQuery, agent);
    return response;
  } else if (method === SyncMethod.CLONE_UP) {
    const { resource, records } = body;
    const query = resolveInsertQuery(resource, records);
    const response = await performQueryOnBehalfOfUser(query, agent);
    return response;
  } else if (method === SyncMethod.CLONE_DOWN) {
    const { resources, isExtension } = body;
    let query = "";
    if (resources?.length < 1) return { error: "No resources found" };
    if (!isExtension) {
      resources.forEach((resource) => {
        query += `select *, meta::id(id) as id from ${resource};`;
      });
    } else {
      resources.forEach((resource) => {
        query += `select * from ${resource};`;
      });
    }
    const response = await performQueryOnBehalfOfUser(query, agent);
    return response;
  } else {
    return { error: "Unknown sync method" };
  }

  function resolveSyncDownQuery(
    lastSyncDown: number,
    resources: Resource[],
    dapId: string
  ) {
    console.log({ at: "resolveSyncDownQuery", lastSyncDown, resources });
    return `SELECT * FROM mutation WHERE timestamp > ${lastSyncDown} AND dapId IS NOT '${dapId}' AND resource IN [${resources
      .map((x) => `'${x}'`)
      .join(",")}] ORDER BY timestamp ASC;`;
  }
}
