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
      logRetention: RetentionDays.THREE_DAYS
    };

    const createAccountRole = (roleName: string) => {
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

    const relayRole = createAccountRole("RelayFunctionRole");

    const accountEndpoint = props.api.addResource("account");

    const pingResource = accountEndpoint.addResource("ping");
    const pingFunction = new lambda.Function(this, "PingFunctionv2", {
      handler: "index.handler",
      functionName: generateFunctionName("pingFunctionv2", props.environment),
      code: lambda.Code.fromAsset(path.join(__dirname, basePath + "ping/dist")),
      ...nodeRuntimeFunctionProps
    });
    pingResource.addMethod("POST", new gateway.LambdaIntegration(pingFunction));

    const relayResource = accountEndpoint.addResource("relay");
    const relayFunction = new lambda.Function(this, "RelayFunctionv2", {
      handler: "index.handler",
      functionName: generateFunctionName("relayFunctionv2", props.environment),
      code: lambda.Code.fromAsset(
        path.join(__dirname, basePath + "relay/dist")
      ),
      ...nodeRuntimeFunctionProps,
      role: relayRole
    });
    relayResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(relayFunction)
    );

    // Grant DynamoDB permissions to lambda functions
    const lambdaFunctions = [pingFunction];
    const relayLambdaFunctions = [relayFunction];

    if (props.dynamoTables) {
      console.log(
        "Granting DynamoDB permissions to account functions for tables:",
        props.dynamoTables.map((table) => ({
          tableName: table.tableName,
          tableArn: table.tableArn
        }))
      );

      // Grant permissions to regular account functions
      props.dynamoTables.forEach((table) => {
        lambdaFunctions.forEach((func) => {
          table.grantReadWriteData(func);
        });
      });

      // Grant permissions to relay function (which needs DynamoDB access for sync operations)
      props.dynamoTables.forEach((table) => {
        relayLambdaFunctions.forEach((func) => {
          table.grantReadWriteData(func);
        });
      });
    }

    for (const resource of [pingResource, relayResource]) {
      resource.addMethod(
        "OPTIONS",
        new gateway.MockIntegration(defaults.mockIntegration),
        defaults.mockIntegrationOptions
      );
    }
  }
}
