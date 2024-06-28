import {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2
} from "aws-lambda";
import { authorize } from "./account";
import { parse } from "querystring";

const accessControlHeaders = {
  "Access-Control-Allow-Origin": "*", //TODO - dynamic origin
  "Access-Control-Allow-Headers": "Content-Type Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

export async function lambdaUsingNode(
  event: APIGatewayProxyEvent,
  callback: any,
  isAuthorize: boolean = true
): Promise<APIGatewayProxyResultV2> {
  let statusCode = 200;
  let responseBody = "";
  let responseHeaders = {};
  let agent = null;
  try {
    if (isAuthorize) {
      let token = event.headers.Authorization?.split(" ")[1];
      agent = await authorize(token);
      if (!agent) {
        return {
          statusCode: 401,
          headers: {
            "Content-Type": "text/plain",
            ...accessControlHeaders
          },
          body: "Unauthorized"
        };
      }
    }
    let body = {};
    let httpMethod = event.httpMethod ?? event.requestContext.httpMethod;
    const contentType =
      event.headers["Content-Type"] ?? event.headers["content-type"];
    console.log({ contentType, httpMethod });
    if (httpMethod === "GET") {
      body = { ...event.queryStringParameters };
      console.log("GET request", {
        body,
        queryStringParameters: event.queryStringParameters
      });
    } else if (httpMethod === "POST") {
      if (contentType === "multipart/form-data") {
        // Parse form data - might need to use a library like `busboy` or `formidable` here
      } else if (contentType === "application/x-www-form-urlencoded") {
        console.log("parsing form data", { body: event.body });
        body = parse(event.body ?? "");
      } else {
        console.log("parsing json data", { body: event.body });
        body = JSON.parse(event.body ?? "");
      }
    }
    const result = await callback(body, agent);
    if (result.statusCode && result.body) {
      statusCode = result.statusCode;
      responseBody = JSON.stringify(result.body);
      responseHeaders = result.headers ?? {};
    } else if (result.statusCode) {
      statusCode = result.statusCode;
      responseHeaders = result.headers ?? {};
    } else {
      responseBody = JSON.stringify(result);
    }
  } catch (e) {
    console.error(e);
    statusCode = 500;
    responseBody = JSON.stringify(e);
  }
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
      ...accessControlHeaders,
      ...responseHeaders
    },
    body: responseBody
  };
}

export async function lamdbaUsingBun(
  request: Request,
  callback: any,
  isAuthorize: boolean = true
) {
  let statusCode = 200;
  let responseBody = "";
  let agent = null;
  try {
    if (isAuthorize) {
      let token = request?.headers?.get("authorization")?.split(" ")[1];
      agent = await authorize(token);
    }
    if (!agent && isAuthorize) {
      return new Response("Unauthorized", {
        status: 401,
        headers: {
          "Content-Type": "text/plain",
          ...accessControlHeaders
        }
      });
    }
    const body = await request.json();
    const result = await callback(body, agent);
    console.log({ result });
    if (result.statusCode && result.body) {
      statusCode = result.statusCode;
      responseBody = JSON.stringify(result.body);
    } else {
      responseBody = JSON.stringify(result);
    }
  } catch (e) {
    console.error(e);
    statusCode = 500;
    responseBody = JSON.stringify(e);
  }
  return new Response(responseBody, {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      ...accessControlHeaders
    }
  });
}
