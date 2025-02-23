import { Duration } from "aws-cdk-lib";
import * as gateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";

import * as path from "path";

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { CustomLambdaNestedStackPropsV2 } from "../../types/customNestedStackProps.type";
import { defaults } from "../../config";
import { generateFunctionName } from "../../cdk.utils";

export class PlanLambdaFunctions extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: CustomLambdaNestedStackPropsV2
  ) {
    super(scope, id, props);
    const basePath = "./../../../../../src/v2/plan/";
    const nodeRuntimeFunctionProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.minutes(defaults.timeout),
      environment: props.lambdaEnvVars,
    };

    const planEndpoint = props.api.addResource("plan");

    const getResource = planEndpoint.addResource("get");
    const getFunction = new lambda.Function(this, "GetPlanFunction", {
      handler: "index.handler",
      functionName: generateFunctionName("getPlanFunction", props.environment),
      code: lambda.Code.fromAsset(path.join(__dirname, basePath + "get/dist")),
      ...nodeRuntimeFunctionProps,
    });
    getResource.addMethod("POST", new gateway.LambdaIntegration(getFunction));

    const subscribeResource = planEndpoint.addResource("subscribe");
    const subscribeFunction = new lambda.Function(
      this,
      "SubscribePlanFunction",
      {
        handler: "index.handler",
        functionName: generateFunctionName(
          "subscribePlanFunction",
          props.environment
        ),
        code: lambda.Code.fromAsset(
          path.join(__dirname, basePath + "subscribe/dist")
        ),
        ...nodeRuntimeFunctionProps,
      }
    );
    subscribeResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(subscribeFunction)
    );

    const verifyResource = planEndpoint.addResource("verify");
    const verifyFunction = new lambda.Function(this, "VerifyPlanFunction", {
      handler: "index.handler",
      functionName: generateFunctionName(
        "verifyPlanFunction",
        props.environment
      ),
      code: lambda.Code.fromAsset(
        path.join(__dirname, basePath + "verify/dist")
      ),
      ...nodeRuntimeFunctionProps,
    });
    verifyResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(verifyFunction)
    );

    const modifyResource = planEndpoint.addResource("modify");
    const modifyFunction = new lambda.Function(this, "ModifyPlanFunction", {
      handler: "index.handler",
      functionName: generateFunctionName(
        "modifyPlanFunction",
        props.environment
      ),
      code: lambda.Code.fromAsset(
        path.join(__dirname, basePath + "modify/dist")
      ),
      ...nodeRuntimeFunctionProps,
    });
    modifyResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(modifyFunction)
    );

    for (const resource of [
      getResource,
      subscribeResource,
      verifyResource,
      modifyResource,
    ]) {
      resource.addMethod(
        "OPTIONS",
        new gateway.MockIntegration(defaults.mockIntegration),
        defaults.mockIntegrationOptions
      );
    }
  }
}
