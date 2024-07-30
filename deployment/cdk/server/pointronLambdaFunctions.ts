import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { CustomLambdaNestedStackProps } from "../types/customNestedStackProps.type";

export class PointronLambdaFunctions extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: CustomLambdaNestedStackProps
  ) {
    super(scope, id, props);
    //TODO - move import/export jobs here
  }
}
