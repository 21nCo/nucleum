import { App, Stack, StackProps } from "aws-cdk-lib";
import { IFilesEnvironmentVariables } from "./../types/env.type";
import { resolveCommonResources } from "./../cdk.utils";
import { CustomFilesNestedStackProps } from "./../types/customNestedStackProps.type";
import { ServerlessFilesRegionalStack } from "./lessFilesRegionalStack";

export class FilesRegionalStack extends Stack {
  constructor(
    scope: App,
    id: string,
    props: StackProps,
    environment: IFilesEnvironmentVariables
  ) {
    super(scope, id, props);

    const { zone } = resolveCommonResources(this, environment);
    const nestedStackProps: CustomFilesNestedStackProps = {
      zone,
      environment,
    };
    new ServerlessFilesRegionalStack(
      this,
      `filesStack-${environment.region}`,
      nestedStackProps
    );
  }
}
