import { authorize, generateToken } from "$lib/server/common/auth";
import { log } from "$lib/server/logger";
import { DatabaseProviderFactory } from "$lib/server/database/providers";
import { Agent, CONTEXT } from "$lib/server/common/account/account.type";
import {
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  ValidationError
} from "../errors";
import { getEmailParts } from "./account.utils";
import { generateRandomIdv2 } from "$lib/shared/utils/crypto.utils";
import { SyncProviderFactory } from "../sync/providers";

export async function signup(data: any, isOAuth = false) {
  console.log("signup", { data, isOAuth });
  const { email, pass, nickName, profilePictureUrl, isTrusted, sub, context } =
    data;
  await betaListCheck(email, context.app);
  const emailParts = getEmailParts(email);
  const joinDate = new Date().toISOString();

  const userData = {
    email,
    password: pass,
    nickName,
    profilePictureUrl,
    guestId: context.guest,
    emailParts,
    joinDate,
    context,
    isOAuth,
    oAuthId: sub
  };

  const provider = DatabaseProviderFactory.getProvider();
  const response = await provider.createUserIfNotExists(userData);
  if (response.user && response.existingUserCount === undefined) {
    console.log("new user created, logging in");
    const userInfo = response.user;
    const userId = userInfo?.id?.split("user:")[1];
    if (!userId)
      return { error: "Something went wrong. Unable to signup user." };
    await log(userId, { ...context, activity: "signup" });
    return await generateToken(userId, userInfo, {
      isTrusted,
      isSignup: true,
      host: context.host
    });
  } else if (isOAuth && response.existingUserCount === 1) {
    console.log("user already exists for OAuth, logging in");
    const userInfo = response.user;
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
    return response.existingUserCount;
  }
}

/**
 * Signs in a user with email and password.
 * @param body email and pass
 * @returns
 */
export async function signin(body: any) {
  const { email, pass, isTrusted, context } = body;
  if (!email || !pass)
    throw new ValidationError("Email and password are required");
  const provider = DatabaseProviderFactory.getProvider();
  const response = await provider.authenticateUser(email, pass);
  if (response && !Array.isArray(response) && response.id) {
    const userId = response.id.split("user:")[1];
    await log(userId, { ...context, activity: "signin" });
    return await generateToken(userId, response, {
      isTrusted,
      host: context.host
    });
  } else {
    return response;
  }
}

const betaProducts = ["web.nucleus.app", "pre.nucleus.app"];

async function betaListCheck(email: string, app: string) {
  if (!betaProducts.includes(app)) return;
  if (!email || !app) {
    throw new ValidationError("Email and app are required");
  }
  const provider = DatabaseProviderFactory.getProvider();
  const response = await provider.checkBetaList(email, app);
  console.log({ at: "beta list response", response });
  if (!response || response?.length === 0) {
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
  const guestData = {
    id,
    timestamp,
    context
  };
  const provider = DatabaseProviderFactory.getProvider();
  const response = await provider.createGuest(guestData);
  if (response) return { id };
  else throw new DatabaseError("Guest creation failed");
}

async function bootstrapUserAccount(authHeader: any, body: any) {
  const { region, context } = body;
  let token = authHeader?.split(" ")[1];
  let agent = await authorize({ token, host: context.host });
  if (!agent) throw new AuthenticationError("Unauthorized");
  const id = agent.id;
  const provider = DatabaseProviderFactory.getProvider();
  await provider.initializeUserDb(id, {
    scope: CONTEXT.USER,
    host: context.host,
    region
  });
  const userPlanId = generateRandomIdv2();
  const userPlanData = {
    id: userPlanId,
    userId: id,
    plan: "trial",
    trialPlan: {
      plan: "2w",
      expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    discount: {
      first: 35
    }
  };
  const userPlanResponse = await provider.createUserPlan(userPlanData);
  console.log("userPlan response", { userPlanResponse });
  const response = await provider.bootstrapUser(id, {
    region,
    userPlanId
  });
  if (!response) throw new DatabaseError("Bootstrapping failed");
  return await generateToken(id, response, { isTrusted: true });
}

export async function deleteUserAccount(body: any, agent: Agent) {
  const { context } = body;
  if (!agent.id) throw new ValidationError("userId is required");
  await log(agent.id, { ...context, activity: "deleteAccount" });
  const provider = DatabaseProviderFactory.getProvider();
  const response = await provider.deleteUser(agent);
  const syncProvider = SyncProviderFactory.getProvider();
  await syncProvider.deleteUser(agent);
  return response;
}
