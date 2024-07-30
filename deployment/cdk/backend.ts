import { App, Stack, StackProps } from "aws-cdk-lib";
import { ServerlessRegionalStack } from "./server/lessRegionalStack";
import { IEnvironment } from "./types/env.type";
import { DatabaseLightsailRegionalStack } from "./database/databaseStack";

import { resolveCommonResources } from "./cdk.utils";
import { CustomNestedStackProps } from "./types/customNestedStackProps.type";

export class BackendRegionalStack extends Stack {
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
      environment
    };
    new ServerlessRegionalStack(
      this,
      `lessStack-${environment.region}`,
      nestedStackProps
    );
    new DatabaseLightsailRegionalStack(
      this,
      `databaseStack-${environment.region}`,
      nestedStackProps
    );
  }
}
