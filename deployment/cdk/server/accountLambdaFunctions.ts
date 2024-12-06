import { Duration } from "aws-cdk-lib";
import * as gateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";

import * as path from "path";

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { CustomLambdaNestedStackProps } from "../types/customNestedStackProps.type";
import { defaults } from "../config";
import { generateFunctionName } from "../cdk.utils";

export class AccountLambdaFunctions extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: CustomLambdaNestedStackProps
  ) {
    super(scope, id, props);

    const functionProps = {
      runtime: lambda.Runtime.PROVIDED_AL2,
      layers: [props.bunRuntimeLayer],
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.minutes(defaults.timeout),
      code: lambda.Code.fromAsset(
        path.join(__dirname, "./../../../../src/endpoints/account/dist")
      ),
      environment: props.lambdaEnvVars
    };
    const nodeRuntimeFunctionProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.minutes(defaults.timeout),
      code: lambda.Code.fromAsset(
        path.join(__dirname, "./../../../../src/endpoints/account/node-dist")
      ),
      environment: props.lambdaEnvVars
    };
    const accountEndpoint = props.api.root.addResource("account");
    const accountNodeEndpoint = accountEndpoint.addResource("n");
    const signupFunction = new lambda.Function(this, "SignupFunction", {
      handler: "signup.handler",
      functionName: generateFunctionName("signupFunction", props.environment),
      ...functionProps
    });
    const updateDbFunction = new lambda.Function(this, "UpdateDbFunction", {
      handler: "updateDb.handler",
      functionName: generateFunctionName("updateDbFunction", props.environment),
      ...functionProps
    });
    const signinFunction = new lambda.Function(this, "SigninFunction", {
      handler: "signin.handler",
      functionName: generateFunctionName("signinFunction", props.environment),
      ...functionProps
    });
    const oauthFunction = new lambda.Function(this, "OauthFunction", {
      handler: "oauth.handler",
      functionName: generateFunctionName("oauthFunction", props.environment),
      ...functionProps
    });
    const pingFunction = new lambda.Function(this, "PingFunction", {
      handler: "ping.handler",
      functionName: generateFunctionName("pingFunction", props.environment),
      ...functionProps
    });
    const deleteAccountFunction = new lambda.Function(
      this,
      "DeleteAccountFunction",
      {
        handler: "deleteAccount.handler",
        functionName: generateFunctionName(
          "deleteAccountFunction",
          props.environment
        ),
        ...functionProps
      }
    );
    const runSqlFunction = new lambda.Function(this, "RunSqlFunction", {
      handler: "runSql.handler",
      functionName: generateFunctionName("runSqlFunction", props.environment),
      ...functionProps
    });
    const signupResource = accountEndpoint.addResource("signup");
    signupResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(signupFunction)
    );
    signupResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const siginResource = accountEndpoint.addResource("signin");
    siginResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(signinFunction)
    );
    siginResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const oauthResource = accountEndpoint.addResource("oauth");
    oauthResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(oauthFunction)
    );
    oauthResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const pingResource = accountEndpoint.addResource("ping");
    pingResource.addMethod("POST", new gateway.LambdaIntegration(pingFunction));
    pingResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const updateDbResource = accountEndpoint.addResource("updateDb");
    updateDbResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(updateDbFunction)
    );
    updateDbResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const deleteAccountResource = accountEndpoint.addResource("deleteAccount");
    deleteAccountResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(deleteAccountFunction)
    );
    deleteAccountResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const runSqlResource = accountEndpoint.addResource("run");
    runSqlResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(runSqlFunction)
    );
    runSqlResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );

    //NODE RUNTIME VARIANTS
    const signupFunctionNode = new lambda.Function(this, "SignupFunctionNode", {
      handler: "signup.handler",
      functionName: generateFunctionName(
        "signupFunctionNode",
        props.environment
      ),
      ...nodeRuntimeFunctionProps
    });
    const updateDbFunctionNode = new lambda.Function(
      this,
      "UpdateDbFunctionNode",
      {
        handler: "updateDb.handler",
        functionName: generateFunctionName(
          "updateDbFunctionNode",
          props.environment
        ),
        ...nodeRuntimeFunctionProps
      }
    );
    // const signinFunctioNode = new lambdaNode.NodejsFunction(
    //   this,
    //   "SigninFunctionNode",
    //   {
    //     handler: "handler",
    //     entry: path.join(__dirname, `./../../src/endpoints/account/signin.ts`),
    //     functionName: generateFunctionName(
    //       "signinFunctionNode",
    //       props.environment
    //     ),
    //     bundling: {
    //       minify: true,
    //       externalModules: ["jsonwebtoken"],
    //     },
    //     ...nodeRuntimeFunctionProps,
    //   }
    // );
    const signinFunctioNode = new lambda.Function(this, "SigninFunctionNode", {
      handler: "signin.handler",
      functionName: generateFunctionName(
        "signinFunctionNode",
        props.environment
      ),
      ...nodeRuntimeFunctionProps
    });
    const oauthFunctionNode = new lambda.Function(this, "OauthFunctionNode", {
      handler: "oauth.handler",
      functionName: generateFunctionName(
        "oauthFunctionNode",
        props.environment
      ),
      ...nodeRuntimeFunctionProps
    });
    const pingFunctionNode = new lambda.Function(this, "PingFunctionNode", {
      handler: "ping.handler",
      functionName: generateFunctionName("pingFunctionNode", props.environment),
      ...nodeRuntimeFunctionProps
    });
    const deleteAccountFunctionNode = new lambda.Function(
      this,
      "DeleteAccountFunctionNode",
      {
        handler: "deleteAccount.handler",
        functionName: generateFunctionName(
          "deleteAccountFunctionNode",
          props.environment
        ),
        ...nodeRuntimeFunctionProps
      }
    );
    const runSqlFunctionNode = new lambda.Function(this, "RunSqlFunctionNode", {
      handler: "runSql.handler",
      functionName: generateFunctionName(
        "runSqlFunctionNode",
        props.environment
      ),
      ...nodeRuntimeFunctionProps
    });
    const refreshTokenNodeFunction = new lambda.Function(
      this,
      "RefreshTokenNodeFunction",
      {
        handler: "refreshToken.handler",
        functionName: generateFunctionName(
          "refreshTokenNodeFunction",
          props.environment
        ),
        ...nodeRuntimeFunctionProps
      }
    );
    const actionFunctionNode = new lambda.Function(this, "ActionFunctionNode", {
      handler: "action.handler",
      functionName: generateFunctionName(
        "actionFunctionNode",
        props.environment
      ),
      ...nodeRuntimeFunctionProps
    });
    const signupNodeResource = accountNodeEndpoint.addResource("signup");
    signupNodeResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(signupFunctionNode)
    );
    signupNodeResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const sigininNodeResource = accountNodeEndpoint.addResource("signin");
    sigininNodeResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(signinFunctioNode)
    );
    sigininNodeResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const oauthNodeResource = accountNodeEndpoint.addResource("oauth");
    oauthNodeResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(oauthFunctionNode)
    );
    oauthNodeResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const pingNodeResource = accountNodeEndpoint.addResource("ping");
    pingNodeResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(pingFunctionNode)
    );
    pingNodeResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const updateDbNodeResource = accountNodeEndpoint.addResource("updateDb");
    updateDbNodeResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(updateDbFunctionNode)
    );
    updateDbNodeResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const deleteAccountNodeResource =
      accountNodeEndpoint.addResource("deleteAccount");
    deleteAccountNodeResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(deleteAccountFunctionNode)
    );
    deleteAccountNodeResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const refreshTokenNodeResource = accountNodeEndpoint.addResource("refresh");
    refreshTokenNodeResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(refreshTokenNodeFunction)
    );
    refreshTokenNodeResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const runSqlNodeResource = accountNodeEndpoint.addResource("run");
    runSqlNodeResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(runSqlFunctionNode)
    );
    runSqlNodeResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const actionNodeResource = accountNodeEndpoint.addResource("action");
    actionNodeResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(actionFunctionNode)
    );
    actionNodeResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );

    const oauthEndpoint = props.api.root.addResource("oauth");
    // const oauthRedirectEndpoint = oauthEndpoint.addResource("r");
    const oauthRedirectResource = oauthEndpoint.addResource("{provider}");
    const oauthRedirectionFunctionNode = new lambda.Function(
      this,
      "OauthRedirectionFunctionNode",
      {
        handler: "oauthRedirect.handler",
        functionName: generateFunctionName(
          "oauthRedirectionFunctionNode",
          props.environment
        ),
        ...nodeRuntimeFunctionProps
      }
    );
    oauthRedirectResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(oauthRedirectionFunctionNode)
    );
    oauthRedirectResource.addMethod(
      "GET",
      new gateway.LambdaIntegration(oauthRedirectionFunctionNode)
    );
    oauthRedirectResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );

    const syncEndpoint = props.api.root.addResource("sync");
    const syncResource = syncEndpoint.addResource("{method}");
    const syncFunctionNode = new lambda.Function(this, "SyncFunctionNode", {
      handler: "sync.handler",
      functionName: generateFunctionName("syncFunctionNode", props.environment),
      ...nodeRuntimeFunctionProps
    });
    syncResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(syncFunctionNode)
    );
    syncResource.addMethod(
      "GET",
      new gateway.LambdaIntegration(syncFunctionNode)
    );
    syncResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );

    const syncV2Endpoint = props.api.root.addResource("syncV2");
    const syncV2Resource = syncV2Endpoint.addResource("{method}");
    const syncV2FunctionNode = new lambda.Function(this, "SyncV2FunctionNode", {
      handler: "syncV2.handler",
      functionName: generateFunctionName(
        "syncV2FunctionNode",
        props.environment
      ),
      ...nodeRuntimeFunctionProps
    });
    syncV2Resource.addMethod(
      "POST",
      new gateway.LambdaIntegration(syncV2FunctionNode)
    );
    syncV2Resource.addMethod(
      "GET",
      new gateway.LambdaIntegration(syncV2FunctionNode)
    );
    syncV2Resource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
  }
}
