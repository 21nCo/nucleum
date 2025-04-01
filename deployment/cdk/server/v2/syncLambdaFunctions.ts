import { Duration } from "aws-cdk-lib";
import * as gateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";

import * as path from "path";

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { CustomLambdaNestedStackPropsV2 } from "../../types/customNestedStackProps.type";
import { defaults } from "../../config";
import { generateFunctionName } from "../../cdk.utils";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

export class SyncLambdaFunctions extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: CustomLambdaNestedStackPropsV2
  ) {
    super(scope, id, props);
    const basePath = "./../../../../../src/v2/sync/";
    const nodeRuntimeFunctionProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.minutes(defaults.timeout),
      environment: props.lambdaEnvVars,
      logRetention: RetentionDays.THREE_DAYS
    };

    const syncEndpoint = props.api.addResource("sync");

    const syncUpResource = syncEndpoint.addResource("up");
    const syncUpFunction = new lambda.Function(this, "SyncUpFunction", {
      handler: "index.handler",
      functionName: generateFunctionName("syncUpFunction", props.environment),
      code: lambda.Code.fromAsset(path.join(__dirname, basePath + "up/dist")),
      ...nodeRuntimeFunctionProps
    });
    syncUpResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(syncUpFunction)
    );

    const syncDownResource = syncEndpoint.addResource("down");
    const syncDownFunction = new lambda.Function(this, "SyncDownFunction", {
      handler: "index.handler",
      functionName: generateFunctionName("syncDownFunction", props.environment),
      code: lambda.Code.fromAsset(path.join(__dirname, basePath + "down/dist")),
      ...nodeRuntimeFunctionProps
    });
    syncDownResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(syncDownFunction)
    );

    const cloneUpResource = syncEndpoint.addResource("cloneup");
    const cloneUpFunction = new lambda.Function(this, "CloneUpFunction", {
      handler: "index.handler",
      functionName: generateFunctionName("cloneUpFunction", props.environment),
      code: lambda.Code.fromAsset(
        path.join(__dirname, basePath + "cloneup/dist")
      ),
      ...nodeRuntimeFunctionProps
    });
    cloneUpResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(cloneUpFunction)
    );

    const cloneDownResource = syncEndpoint.addResource("clonedown");
    const cloneDownFunction = new lambda.Function(this, "CloneDownFunction", {
      handler: "index.handler",
      functionName: generateFunctionName(
        "cloneDownFunction",
        props.environment
      ),
      code: lambda.Code.fromAsset(
        path.join(__dirname, basePath + "clonedown/dist")
      ),
      ...nodeRuntimeFunctionProps
    });
    cloneDownResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(cloneDownFunction)
    );

    const paginateResource = syncEndpoint.addResource("paginate");
    const paginateFunction = new lambda.Function(this, "PaginateFunction", {
      handler: "index.handler",
      functionName: generateFunctionName("paginateFunction", props.environment),
      code: lambda.Code.fromAsset(
        path.join(__dirname, basePath + "paginate/dist")
      ),
      ...nodeRuntimeFunctionProps
    });
    paginateResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(paginateFunction)
    );

    const reconcileResource = syncEndpoint.addResource("reconcile");
    const reconcileFunction = new lambda.Function(this, "ReconcileFunction", {
      handler: "index.handler",
      functionName: generateFunctionName(
        "reconcileFunction",
        props.environment
      ),
      code: lambda.Code.fromAsset(
        path.join(__dirname, basePath + "reconcile/dist")
      ),
      ...nodeRuntimeFunctionProps
    });
    reconcileResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(reconcileFunction)
    );

    for (const resource of [
      syncUpResource,
      syncDownResource,
      cloneUpResource,
      cloneDownResource,
      paginateResource,
      reconcileResource
    ]) {
      resource.addMethod(
        "OPTIONS",
        new gateway.MockIntegration(defaults.mockIntegration),
        defaults.mockIntegrationOptions
      );
    }
  }
}
