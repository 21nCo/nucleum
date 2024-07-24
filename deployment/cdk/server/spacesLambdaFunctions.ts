import { Duration } from "aws-cdk-lib";
import * as gateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { defaults } from "../config";
import { generateFunctionName } from "../cdk.utils";
import { CustomLambdaNestedStackProps } from "../types/customNestedStackProps.type";

export class SpacesLambdaFunctions extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: CustomLambdaNestedStackProps
  ) {
    super(scope, id, props);

    const nodeRuntimeFunctionProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.minutes(defaults.timeout),
      code: lambda.Code.fromAsset(
        path.join(__dirname, "./../../../../src/endpoints/spaces/node-dist")
      ),
      environment: props.lambdaEnvVars
    };

    const spacesEndpoint = props.api.root.addResource("space");
    const spacesNodeEndpoint = spacesEndpoint.addResource("n");
    const spaceActionFunction = new lambda.Function(this, "SpaceActionFnNode", {
      handler: "spaceAction.handler",
      functionName: generateFunctionName(
        "SpaceActionFunctionNode",
        props.environment
      ),
      ...nodeRuntimeFunctionProps
    });
    const spaceActionResource = spacesNodeEndpoint.addResource("action");
    spaceActionResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(spaceActionFunction)
    );
    spaceActionResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const spaceDocFunction = new lambda.Function(this, "SpaceDocFnNode", {
      handler: "spaceDoc.handler",
      functionName: generateFunctionName(
        "SpaceDocFunctionNode",
        props.environment
      ),
      ...nodeRuntimeFunctionProps
    });
    const spaceDocResource = spacesNodeEndpoint.addResource("doc");
    spaceDocResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(spaceDocFunction)
    );
    spaceDocResource.addMethod(
      "OPTIONS",
      new gateway.MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
  }
}
