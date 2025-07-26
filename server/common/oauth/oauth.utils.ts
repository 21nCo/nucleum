import jwt from "jsonwebtoken";
import { OAuthUserData } from "./oauth.type";

async function retrieveAccessToken(config, code, redirectUri) {
  // console.log("retrieveAccessToken", { config, code });
  if (config.method_for_token === "GET") {
    const url =
      config.token_url +
      "?client_id=" +
      config.client_id +
      "&redirect_uri=" +
      redirectUri +
      "&client_secret=" +
      config.client_secret +
      "&code=" +
      code +
      "&grant_type=authorization_code";
    return fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });
  } else {
    return fetch(config.token_url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body:
        "client_id=" +
        config.client_id +
        "&redirect_uri=" +
        redirectUri +
        "&client_secret=" +
        config.client_secret +
        "&code=" +
        code +
        "&grant_type=authorization_code" +
        "&code_verifier=challenge"
    });
  }
}

function generateClientSecret(config, privateKey: string) {
  const token = jwt.sign({}, privateKey, {
    algorithm: "ES256",
    expiresIn: "1h",
    audience: "https://appleid.apple.com",
    issuer: config.team_id,
    subject: config.client_id,
    keyid: config.key_id
  });
  return token;
}

function resolveClientSecret(config) {
  const slug = config.oauth_slug;
  if (slug === "github") {
    return process.env.VITE_GITHUB_SECRET;
  } else if (slug === "google") {
    return process.env.OAUTH_GOOGLE_SECRET;
  } else if (slug === "apple") {
    if (process.env.OAUTH_APPLE_SECRET)
      return generateClientSecret(config, process.env.OAUTH_APPLE_SECRET);
  }
}

export async function fetchOAuthUserData(
  config: any,
  code: string,
  redirectUri: string
) {
  if (!config.client_secret) {
    config.client_secret = resolveClientSecret(config);
  }
  let response = await retrieveAccessToken(config, code, redirectUri);
  let accessToken;
  let parsedAccessToken = await response.json();
  try {
    //let parsedJson = await JSON.parse(parsedAccessToken);
    accessToken = parsedAccessToken.access_token;
  } catch (e) {
    let parsedText = new URLSearchParams(parsedAccessToken);
    accessToken = parsedText.get("access_token");
  }
  let userDetails;
  if (parsedAccessToken.id_token && config.userdata_method === "idtoken") {
    let decoded = jwt.decode(parsedAccessToken.id_token, { complete: true });
    userDetails = decoded.payload;
  } else if (config.provider === "stackoverflow.com") {
    let userDetailsResponse = await fetch(
      config.userdata_url +
        "&key=" +
        process.env.VITE_OVERFLOW_KEY +
        "&access_token=" +
        accessToken
    );
    userDetails = await userDetailsResponse.json();
  } else {
    let userDetailsResponse = await fetch(config.userdata_url, {
      headers: {
        Authorization: "Bearer " + accessToken,
        Accept: config.accept_format ?? "application/json"
      }
    });
    // const responseForUserDetails = await userDetailsResponse.text();
    console.log({ userDetailsResponse });
    userDetails = await userDetailsResponse.json();
  }
  return userDetails;
}

/**
 * Parse the OAuth user data for Apple
 *
 * Note: For Apple private relay users, email will not be present in user object - used parsed email from id_token.
 *
 * @param authResponse - The response from the OAuth provider
 * @returns The parsed user data
 */
export function parseOAuthUserDataForApple(authResponse: {
  user?: {
    email: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
  id_token?: string;
}): OAuthUserData {
  const { id_token, user } = authResponse;
  if (id_token && user) {
    let decoded = jwt.decode(id_token, { complete: true });
    return {
      ...decoded.payload,
      firstName: user.name?.firstName,
      lastName: user.name?.lastName,
      email: user.email ?? decoded.payload.email
    };
  } else if (id_token) {
    let decoded = jwt.decode(id_token, { complete: true });
    return decoded.payload;
  } else if (user) {
    return {
      firstName: user?.name?.firstName,
      lastName: user?.name?.lastName,
      email: user.email
    };
  }
}
