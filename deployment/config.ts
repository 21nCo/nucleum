import * as gateway from "aws-cdk-lib/aws-apigateway";

//TODO - allowed origins to check dynamically
export const defaults = {
  rootDomain: "tidigit.com",
  timeout: 10,
  longRunningJobTimeout: 200,
  jwtSecret: "secret",
  subatom: "POINTRON",
  tidyTokenKey: "tokenone",
  adminNamespace: "TIDYADMINDEV",
  adminDatabase: "user",
  userNamespace: "TIDYDEV",
  spaceNamespace: "SPACE",
  mockIntegration: {
    integrationResponses: [
      {
        statusCode: "200",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Headers":
            "'Content-Type,Authorization'",
          "method.response.header.Access-Control-Allow-Origin": "'*'",
          "method.response.header.Access-Control-Allow-Methods":
            "'OPTIONS,GET,POST'",
        },
      },
    ],
    passthroughBehavior: gateway.PassthroughBehavior.NEVER,
    requestTemplates: {
      "application/json": '{"statusCode": 200}',
    },
  },
  mockIntegrationOptions: {
    methodResponses: [
      {
        statusCode: "200",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Origin": true,
          "method.response.header.Access-Control-Allow-Methods": true,
        },
      },
    ],
  },
};
