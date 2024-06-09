import jwt from "jsonwebtoken";
import fs from "fs";
async function retrieveAccessToken(config, code, redirectUri) {
  console.log("retrieveAccessToken", { config, code });
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
        Accept: "application/json",
      },
    });
  } else {
    return fetch(config.token_url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
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
        "&code_verifier=challenge",
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
    keyid: config.key_id,
  });
  console.log("client secret generated", token);
  return token;
}

function resolveClientSecret(config) {
  const slug = config.oauth_slug;
  if (slug === "github") {
    return process.env.VITE_GITHUB_SECRET;
  } else if (slug === "google") {
    return process.env.VITE_GOOGLE_SECRET;
  } else if (slug === "apple") {
    if (process.env.APPLE_OAUTH_SECRET)
      return generateClientSecret(config, process.env.APPLE_OAUTH_SECRET);
  }
}

export async function processOAuth(slug, config, code, redirectUri) {
  if (!config.client_secret) {
    config.client_secret = resolveClientSecret(config);
  }
  let response = await retrieveAccessToken(config, code, redirectUri);
  console.log("accessTokenResponse", { response });
  let accessToken;
  let parsedAccessToken = await response.json();
  try {
    console.log({ parsedAccessToken });
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
        Accept: config.accept_format ?? "application/json",
      },
    });
    // const responseForUserDetails = await userDetailsResponse.text();
    // console.log({ responseForUserDetails });
    userDetails = await userDetailsResponse.json();
    console.log("userDetails", userDetails);
  }
  return userDetails;
}
