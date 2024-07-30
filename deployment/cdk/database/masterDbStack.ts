import { App, Stack, StackProps } from "aws-cdk-lib";
import { IEnvironment } from "../types/env.type";
import { resolveCommonResources } from "../cdk.utils";
import { CustomNestedStackProps } from "../types/customNestedStackProps.type";
import { DatabaseLightsailRegionalStack } from "./databaseStack";

export class MasterDatabaseStack extends Stack {
  constructor(
    scope: App,
    id: string,
    props: StackProps,
    environment: IEnvironment
  ) {
    super(scope, id, props);

    const { zone, bunRuntimeLayer } = resolveCommonResources(this, environment);
    const nestedStackProps: CustomNestedStackProps = {
      zone,
      bunRuntimeLayer,
      environment,
      isMasterDb: true
    };
    new DatabaseLightsailRegionalStack(
      this,
      `masterDatabaseNestedStack-${environment.region}`,
      nestedStackProps
    );
  }
}
