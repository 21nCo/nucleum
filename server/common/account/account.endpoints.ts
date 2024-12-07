import {
  deleteUserAccount,
  performUserAccountAction,
  signin,
  signup
} from "$lib/server/common/account";
import { Agent } from "$lib/server/common/account/account.type";
import { refreshToken } from "../auth";

export async function handleAccountSignup(body: any) {
  return signup(body);
}

export async function handleAccountSignin(body: any) {
  return signin(body);
}

export async function handleAccountRefreshToken(body: any, agent: Agent) {
  return refreshToken(body, agent);
}

export async function handleAccountDelete(body: any, agent: Agent) {
  return deleteUserAccount(body, agent);
}

export async function handleAccountAction(authHeader: any, body: any) {
  return performUserAccountAction(authHeader, body);
}
