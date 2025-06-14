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
import { Role, ServicePrincipal, ManagedPolicy } from "aws-cdk-lib/aws-iam";

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

    const createSyncRole = (roleName: string) => {
      return new Role(this, roleName, {
        roleName: `${props.environment.environment}-${props.environment.region}-${roleName}`,
        assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          )
        ]
      });
    };

    const syncUpRole = createSyncRole("SyncUpFunctionRole");
    const syncDownRole = createSyncRole("SyncDownFunctionRole");
    const cloneUpRole = createSyncRole("CloneUpFunctionRole");
    const cloneDownRole = createSyncRole("CloneDownFunctionRole");
    const cloneDownV2Role = createSyncRole("CloneDownv2FunctionRole");
    const paginateRole = createSyncRole("PaginateFunctionRole");
    const paginateV2Role = createSyncRole("Paginatev2FunctionRole");
    const reconcileRole = createSyncRole("ReconcileFunctionRole");

    const syncEndpoint = props.api.addResource("sync");

    const syncUpResource = syncEndpoint.addResource("up");
    const syncUpFunction = new lambda.Function(this, "SyncUpFunction", {
      handler: "index.handler",
      functionName: generateFunctionName("syncUpFunction", props.environment),
      code: lambda.Code.fromAsset(path.join(__dirname, basePath + "up/dist")),
      ...nodeRuntimeFunctionProps,
      role: syncUpRole
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
      ...nodeRuntimeFunctionProps,
      role: syncDownRole
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
      ...nodeRuntimeFunctionProps,
      role: cloneUpRole
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
      ...nodeRuntimeFunctionProps,
      role: cloneDownRole
    });
    cloneDownResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(cloneDownFunction)
    );

    const cloneDownV2Resource = syncEndpoint.addResource("clonedownv2");
    const cloneDownV2Function = new lambda.Function(
      this,
      "CloneDownV2Function",
      {
        handler: "index.handler",
        functionName: generateFunctionName(
          "cloneDownV2Function",
          props.environment
        ),
        code: lambda.Code.fromAsset(
          path.join(__dirname, basePath + "clonedownv2/dist")
        ),
        ...nodeRuntimeFunctionProps,
        role: cloneDownV2Role
      }
    );
    cloneDownV2Resource.addMethod(
      "POST",
      new gateway.LambdaIntegration(cloneDownV2Function)
    );

    const paginateResource = syncEndpoint.addResource("paginate");
    const paginateFunction = new lambda.Function(this, "PaginateFunction", {
      handler: "index.handler",
      functionName: generateFunctionName("paginateFunction", props.environment),
      code: lambda.Code.fromAsset(
        path.join(__dirname, basePath + "paginate/dist")
      ),
      ...nodeRuntimeFunctionProps,
      role: paginateRole
    });
    paginateResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(paginateFunction)
    );

    const paginateV2Resource = syncEndpoint.addResource("paginatev2");
    const paginateV2Function = new lambda.Function(this, "PaginateV2Function", {
      handler: "index.handler",
      functionName: generateFunctionName(
        "paginateV2Function",
        props.environment
      ),
      code: lambda.Code.fromAsset(
        path.join(__dirname, basePath + "paginatev2/dist")
      ),
      ...nodeRuntimeFunctionProps,
      role: paginateV2Role
    });
    paginateV2Resource.addMethod(
      "POST",
      new gateway.LambdaIntegration(paginateV2Function)
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
      ...nodeRuntimeFunctionProps,
      role: reconcileRole
    });
    reconcileResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(reconcileFunction)
    );

    // Grant DynamoDB permissions to all lambda functions
    const lambdaFunctions = [
      syncUpFunction,
      syncDownFunction,
      cloneUpFunction,
      cloneDownFunction,
      cloneDownV2Function,
      paginateFunction,
      paginateV2Function,
      reconcileFunction
    ];

    if (props.dynamoTables) {
      console.log(
        "Granting DynamoDB permissions to sync functions for tables:",
        props.dynamoTables.map((table) => ({
          tableName: table.tableName,
          tableArn: table.tableArn
        }))
      );
      props.dynamoTables.forEach((table) => {
        lambdaFunctions.forEach((func) => {
          table.grantReadWriteData(func);
        });
      });
    }

    for (const resource of [
      syncUpResource,
      syncDownResource,
      cloneUpResource,
      cloneDownResource,
      cloneDownV2Resource,
      paginateResource,
      paginateV2Resource,
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
