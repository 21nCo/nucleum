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
export class EmbedLambdaFunctions extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: CustomLambdaNestedStackPropsV2
  ) {
    super(scope, id, props);
    const basePath = "./../../../../../src/v2/embed/";
    const nodeRuntimeFunctionProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.minutes(defaults.timeout),
      environment: props.lambdaEnvVars,
      logRetention: RetentionDays.THREE_DAYS
    };

    const embedEndpoint = props.api.addResource("embed");

    const widgetEndpoint = embedEndpoint.addResource("widget");
    const widgetInstanceResource = widgetEndpoint.addResource("{name}");
    const widgetFunction = new lambda.Function(this, "WidgetFunction", {
      handler: "index.handler",
      functionName: generateFunctionName("widgetFunction", props.environment),
      code: lambda.Code.fromAsset(
        path.join(__dirname, basePath + "widget/dist")
      ),
      ...nodeRuntimeFunctionProps
    });
    widgetInstanceResource.addMethod(
      "GET",
      new gateway.LambdaIntegration(widgetFunction)
    );
    widgetInstanceResource.addMethod(
      "POST",
      new gateway.LambdaIntegration(widgetFunction)
    );

    for (const resource of [widgetInstanceResource]) {
      resource.addMethod(
        "OPTIONS",
        new gateway.MockIntegration(defaults.mockIntegration),
        defaults.mockIntegrationOptions
      );
    }
  }
}
