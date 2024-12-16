import { App, Stack, StackProps } from "aws-cdk-lib";
import { IDatabaseEnvironmentVariables } from "./../types/env.type";
import { DatabaseLightsailRegionalStack } from "./databaseStack";

import { resolveCommonResources } from "./../cdk.utils";
import { CustomDatabaseNestedStackProps } from "./../types/customNestedStackProps.type";

export class DatabaseRegionalStack extends Stack {
  constructor(
    scope: App,
    id: string,
    props: StackProps,
    environment: IDatabaseEnvironmentVariables
  ) {
    super(scope, id, props);

    const { zone } = resolveCommonResources(this, environment);
    const nestedStackProps: CustomDatabaseNestedStackProps = {
      zone,
      environment,
    };
    new DatabaseLightsailRegionalStack(
      this,
      `databaseStack-${environment.region}`,
      nestedStackProps
    );
  }
}
