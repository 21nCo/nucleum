import { Duration } from "aws-cdk-lib";
import * as gateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";

import * as path from "path";

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { CustomLambdaNestedStackPropsV2 } from "../../types/customNestedStackProps.type";
import { defaults } from "../../config";
import { generateFunctionName } from "../../cdk.utils";

export class AccountLambdaFunctions extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: CustomLambdaNestedStackPropsV2
  ) {
    super(scope, id, props);
    const basePath = "./../../../../../src/v2/account/";
    const nodeRuntimeFunctionProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.minutes(defaults.timeout),
      environment: props.lambdaEnvVars,
    };

    const accountEndpoint = props.api.addResource("account");

    const pingResource = accountEndpoint.addResource("ping");
    const pingFunction = new lambda.Function(this, "PingFunctionv2", {
      handler: "index.handler",
      functionName: generateFunctionName("pingFunctionv2", props.environment),
      code: lambda.Code.fromAsset(path.join(__dirname, basePath + "ping/dist")),
      ...nodeRuntimeFunctionProps,
    });
    pingResource.addMethod("POST", new gateway.LambdaIntegration(pingFunction));

    for (const resource of [pingResource]) {
      resource.addMethod(
        "OPTIONS",
        new gateway.MockIntegration(defaults.mockIntegration),
        defaults.mockIntegrationOptions
      );
    }
  }
}
