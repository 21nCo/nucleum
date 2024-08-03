import * as cdk from "aws-cdk-lib";
import { Duration, aws_s3 } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CustomLambdaNestedStackProps } from "../types/customNestedStackProps.type";
import { generateFunctionName } from "../cdk.utils";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { defaults } from "../config";
import * as path from "path";
import { LambdaIntegration, MockIntegration } from "aws-cdk-lib/aws-apigateway";
export class PointronLambdaFunctions extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: CustomLambdaNestedStackProps,
    fileBuckets: aws_s3.IBucket[]
  ) {
    super(scope, id, props);

    const dependenciesLayer = new lambda.LayerVersion(
      this,
      "DependenciesLayer",
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, "./../../../../src/layers/py/lambda-layer.zip")
        ),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_10],
        description: "Dependencies for Pointron Lambda functions"
      }
    );

    const pythonRuntimeFunctionProps = {
      runtime: lambda.Runtime.PYTHON_3_10,
      timeout: Duration.minutes(defaults.timeout),
      code: lambda.Code.fromAsset(
        path.join(__dirname, "./../../../../src/endpoints/pointron/importJob")
      ),
      environment: props.lambdaEnvVars
    };
    const pointronEndpoint = props.api.root.addResource("pointron");
    const importFunction = new lambda.Function(this, "importFunction", {
      handler: "importJobs.lambdaHandler",
      layers: [dependenciesLayer],
      functionName: generateFunctionName("importFunction", props.environment),
      ...pythonRuntimeFunctionProps
    });

    fileBuckets.forEach((x) => x.grantReadWrite(importFunction));
    const importEndpoint = pointronEndpoint.addResource("import");
    importEndpoint.addMethod("POST", new LambdaIntegration(importFunction));
    importEndpoint.addMethod(
      "OPTIONS",
      new MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
    const pingFunction = new lambda.Function(this, "pythonPingFunction", {
      handler: "ping.lambdaHandler",
      functionName: generateFunctionName(
        "pythonPingFunction",
        props.environment
      ),
      ...pythonRuntimeFunctionProps
    });
    const pingResource = pointronEndpoint.addResource("ping");
    pingResource.addMethod("POST", new LambdaIntegration(pingFunction));
    pingResource.addMethod(
      "OPTIONS",
      new MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
  }
}
