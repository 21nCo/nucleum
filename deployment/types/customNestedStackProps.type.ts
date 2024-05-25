import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Environment } from "./env.type";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as gateway from "aws-cdk-lib/aws-apigateway";

export interface CustomNestedStackProps extends cdk.NestedStackProps {
  zone: route53.IHostedZone;
  certificate: acm.Certificate;
  certificateForSub?: acm.Certificate;
  environment: Environment;
  lambdaEnvVars: any;
}

export interface CustomLambdaNestedStackProps extends CustomNestedStackProps {
  api: gateway.RestApi;
  bunRuntimeLayer: lambda.ILayerVersion;
}
