import { authorize, generateToken } from "$lib/server/common/auth";
import { log } from "$lib/server/logger";
import {
  performQueryOnMasterDb,
  performQueryOnRegionalDb
} from "$lib/server/surrealHelpers";
import { Agent, CONTEXT } from "$lib/server/common/account/account.type";
import {
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  ValidationError
} from "../errors";
import { performQueryOnBehalfOfUser } from "../user/user";
import { getEmailParts } from "./account.utils";
import { generateRandomIdv2 } from "$lib/shared/utils/crypto.utils";

export async function signup(data: any, isOAuth = false) {
  console.log("signup", { data, isOAuth });
  const { email, pass, nickName, profilePictureUrl, isTrusted, sub, context } =
    data;
  await betaListCheck(email, context.app);
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
    const userId = userInfo?.id?.split("user:")[1];
    if (!userId)
      return { error: "Something went wrong. Unable to signup user." };
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

const betaProducts = ["app.selftron.io", "pre.selftron.io", "tidigit.com"];

async function betaListCheck(email: string, app: string) {
  if (!betaProducts.includes(app)) return;
  if (!email || !app) {
    throw new ValidationError("Email and app are required");
  }
  const query = `SELECT * from betaList where email is "${email}" and product is "${app}"`;
  const response = await performQueryOnMasterDb(query);
  const val = response?.[0]?.result;
  console.log({ at: "beta list response", response, val });
  if (!val || val?.length === 0) {
    throw new AuthorizationError(
      "You are not in the beta list for this product"
    );
  }
}

export async function performUserAccountAction(authHeader: any, body: any) {
  if (!body.action) throw new ValidationError("Action is required");
  switch (body.action) {
    case "guest":
      return createGuest(body);
    case "bootstrap":
      return bootstrapUserAccount(authHeader, body);
  }
}

async function createGuest(body: any) {
  const { id, context } = body;
  const timestamp = new Date().toISOString();
  const query = `create guest set id = "${id}", timestamp = "${timestamp}", context = ${JSON.stringify(
    context
  )}; create activity set userId = "guest:${id}", timestamp = "${timestamp}", context = ${JSON.stringify(
    { ...context, action: "guest-visit" }
  )};`;
  const response = await performQueryOnMasterDb(query);
  if (response) return { id };
  else throw new DatabaseError("Guest creation failed");
}

async function bootstrapUserAccount(authHeader: any, body: any) {
  const { region, context } = body;
  let token = authHeader?.split(" ")[1];
  let agent = await authorize({ token, host: context.host });
  if (!agent) throw new AuthenticationError("Unauthorized");
  const id = agent.id;
  const bootstrapResponse = await initializeDatabase(id, {
    scope: CONTEXT.USER,
    host: context.host,
    region
  });
  console.log("bootstrap response", { bootstrapResponse });
  const userPlanId = generateRandomIdv2();
  const userPlanQuery = `create userPlan content {
    id: userPlan:${userPlanId},
    userId: user:${id},
    plan: "trial",
    trialPlan: {
    plan: "1mo",
    expiry: d"${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}",
    },
    discount: {
      first: 35,
    },
  }`;
  const userPlanResponse = await performQueryOnMasterDb(userPlanQuery);
  console.log("userPlan response", { userPlanResponse });
  const query = `update user:${id} set region = "${region}", userPlan = userPlan:${userPlanId}, isBootstrapped = true; select context.guest.* as guest from user:${id};`;
  const response = await performQueryOnMasterDb(query);
  console.log("bootstrap response", { response: JSON.stringify(response) });
  if (!response) throw new DatabaseError("Bootstrapping failed");
  const userInfo = response[0].result[0];
  const tzInfo = response[1]?.result?.[0]?.guest?.context?.timezone;
  console.log("tzInfo", tzInfo);
  if (tzInfo) {
    try {
      const tzQuery = `create tz set date = "${new Date(
        Date.UTC(1970, 0, 1)
      ).toISOString()}", offset = ${tzInfo.offset}, label = "${tzInfo.label}";`;
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

export async function deleteUserAccount(body: any, agent: Agent) {
  const { context } = body;
  if (!agent.id) throw new ValidationError("userId is required");
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

/**
 * Initializes the database and definitions for a user account
 * @param id id of the resource that needs to be initialized - can be a user database or space database requested by the user
 * @param host
 * @returns
 */
export async function initializeDatabase(
  id: string,
  params: { scope: CONTEXT; host: string; region?: string }
) {
  const ns =
    params.scope === CONTEXT.USER
      ? process.env.USER_NS ?? "user"
      : process.env.SPACE_NS ?? "space";
  // let query = `USE NAMESPACE ${ns}; DEFINE DATABASE ${id}; USE DATABASE ${id}; DEFINE TOKEN ${process.env.TOKEN_NAME} ON DB TYPE RS384 VALUE "${process.env.TOKEN_PUBLIC_KEY}";`;
  let query = `USE NAMESPACE ${ns}; DEFINE DATABASE ${id};`;
  const dbCreationResponse = await performQueryOnRegionalDb(query, {
    region: params.region,
    db: id,
    context: params.scope
  });
  return dbCreationResponse;
}
