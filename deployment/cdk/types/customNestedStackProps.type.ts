import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import {
  IDatabaseEnvironmentVariables,
  IEnvironment,
  IFilesEnvironmentVariables,
  ILambdaEnvironmentVariables
} from "./env.type";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as gateway from "aws-cdk-lib/aws-apigateway";

export interface CustomNestedStackProps extends cdk.NestedStackProps {
  zone: route53.IHostedZone;
  bunRuntimeLayer?: lambda.ILayerVersion;
  environment: IEnvironment;
  /**
   * Relevant for Db Stacks only
   */
  isMasterDb?: boolean;
}

export interface CustomLambdaNestedStackProps extends CustomNestedStackProps {
  api: gateway.RestApi;
  lambdaEnvVars: ILambdaEnvironmentVariables;
}

export interface CustomLambdaNestedStackPropsV2 extends CustomNestedStackProps {
  api: gateway.Resource;
  lambdaEnvVars: ILambdaEnvironmentVariables;
}

export interface CustomDatabaseNestedStackProps extends cdk.NestedStackProps {
  zone: route53.IHostedZone;
  environment: IDatabaseEnvironmentVariables;
  isMasterDb?: boolean;
}

export interface CustomFilesNestedStackProps extends cdk.NestedStackProps {
  zone: route53.IHostedZone;
  environment: IFilesEnvironmentVariables;
}

export interface CustomFilesLambdaNestedStackProps
  extends cdk.NestedStackProps {
  zone: route53.IHostedZone;
  environment: IFilesEnvironmentVariables;
  api: gateway.RestApi;
}
