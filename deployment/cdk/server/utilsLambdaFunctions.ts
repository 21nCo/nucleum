import { aws_s3, Duration, NestedStack } from "aws-cdk-lib";
import * as path from "path";
import { Construct } from "constructs";
import { CustomLambdaNestedStackProps } from "../types/customNestedStackProps.type";
import { defaults } from "../config";
import { generateFunctionName } from "../cdk.utils";
import {
  Architecture,
  Code,
  Function,
  LayerVersion,
  Runtime
} from "aws-cdk-lib/aws-lambda";
import { LambdaIntegration, MockIntegration } from "aws-cdk-lib/aws-apigateway";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
export class UtilsLambdaFunctions extends NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: CustomLambdaNestedStackProps
  ) {
    super(scope, id, props);
    const dependencyLayer = new LayerVersion(this, "MyLayer", {
      code: Code.fromAsset(
        path.join(__dirname, "./../../../../src/endpoints/utils/layers")
      ),
      compatibleRuntimes: [Runtime.NODEJS_20_X],
      license: "Apache-2.0",
      description: "A layer to hold the AWS SDK and other dependencies"
    });
    /**
     * @deprecated - not used anymore as bun functions were removed.
     */
    const functionProps = {
      runtime: Runtime.PROVIDED_AL2,
      // layers: [props.bunRuntimeLayer],
      architecture: Architecture.ARM_64,
      timeout: Duration.minutes(defaults.timeout),
      code: Code.fromAsset(
        path.join(__dirname, "./../../../../src/endpoints/utils/dist")
      ),
      environment: props.lambdaEnvVars
    };
    const nodeRuntimeFunctionProps = {
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.minutes(defaults.timeout),
      layers: [dependencyLayer],
      code: Code.fromAsset(
        path.join(__dirname, "./../../../../src/endpoints/utils/node-dist")
      ),
      environment: props.lambdaEnvVars,
      logRetention: RetentionDays.ONE_DAY
    };

    const utils = props.api.root.addResource("utils");
    const utilsNodeResource = utils.addResource("n");

    const runNodeFunction = new Function(this, "runUtilsFunction", {
      functionName: generateFunctionName("runUtilsFunction", props.environment),
      handler: "run.handler",
      memorySize: 512,
      ...nodeRuntimeFunctionProps
    });
    const runNodeResource = utilsNodeResource.addResource("run");
    runNodeResource.addMethod("POST", new LambdaIntegration(runNodeFunction));
    runNodeResource.addMethod(
      "OPTIONS",
      new MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );

    const geoNodeFunction = new Function(this, "geoNodeFunction", {
      functionName: generateFunctionName("geoNodeFunction", props.environment),
      handler: "geo.handler",
      ...nodeRuntimeFunctionProps
    });
    const geoNodeResource = utilsNodeResource.addResource("geo");
    geoNodeResource.addMethod("POST", new LambdaIntegration(geoNodeFunction));
    geoNodeResource.addMethod(
      "OPTIONS",
      new MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );

    const saveSubscriptionNodeFunction = new Function(
      this,
      "saveSubscription",
      {
        functionName: generateFunctionName(
          "saveSubscription",
          props.environment
        ),
        handler: "subscribe.handler",
        ...nodeRuntimeFunctionProps
      }
    );
    const subscriptionResource = utilsNodeResource.addResource("subscribe");
    subscriptionResource.addMethod(
      "POST",
      new LambdaIntegration(saveSubscriptionNodeFunction)
    );
    subscriptionResource.addMethod(
      "OPTIONS",
      new MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );

    let urlShortenerNodeFunction = new Function(this, "urlShortener", {
      functionName: generateFunctionName("urlShortener", props.environment),
      handler: "urlShortener.handler",
      ...nodeRuntimeFunctionProps
    });
    const linkEndpoint = props.api.root.addResource("l");
    const urlShortenerResource = linkEndpoint.addResource("{slug}");

    urlShortenerResource.addMethod(
      "GET",
      new LambdaIntegration(urlShortenerNodeFunction)
    );
    urlShortenerResource.addMethod(
      "OPTIONS",
      new MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );

    // const utils_send_communication = new lambdaNode.NodejsFunction(
    //   this,
    //   "sendcommunicationfunction",
    //   {
    //     functionName: "sendcommunicationfunction",
    //     memorySize: 1024,
    //     timeout: Duration.seconds(defaults.timeout),
    //     runtime: Runtime.NODEJS_16_X,
    //     handler: "main",
    //     entry: path.join(
    //       __dirname,
    //       `./../../src/utils/communication/sendHandler.ts`
    //     ),
    //     bundling: {
    //       minify: true,
    //       externalModules: ["aws-sdk"],
    //     },
    //   }
    // );
    // utils_send_communication.addToRolePolicy(
    //   new iam.PolicyStatement({
    //     actions: ["ses:SendEmail", "SES:SendRawEmail"],
    //     resources: ["*"],
    //     effect: iam.Effect.ALLOW,
    //   })
    // );

    // utils_send_communication.addEventSource(new DynamoEventSource(tidigitTable, {
    //   startingPosition: StartingPosition.LATEST,
    // }))

    // const utils_communication = new lambdaNode.NodejsFunction(
    //   this,
    //   "communicationfunction",
    //   {
    //     memorySize: 1024,
    //     timeout: Duration.seconds(defaults.timeout),
    //     runtime: Runtime.NODEJS_16_X,
    //     handler: "main",
    //     entry: path.join(
    //       __dirname,
    //       `/../src/utils/communication/communication.ts`
    //     ),
    //     bundling: {
    //       minify: true,
    //       externalModules: ["aws-sdk"],
    //     },
    //     environment: {
    //       SEND_FUNCTION_NAME: utils_send_communication.functionName,
    //     },
    //   }
    // );
    // utils_send_communication.grantInvoke(utils_communication);
    // const communication_end_point = utils.addResource("communication");
    // communication_end_point.addMethod(
    //   "POST",
    //   new LambdaIntegration(utils_communication)
    // );

    // let accountCreationEmailTemplate = new CfnTemplate(this, 'accountcreationtemplate', { template: { templateName: "accountcreation", subjectPart: "Your account is ready", textPart: "", htmlPart: "" } })
  }
}
