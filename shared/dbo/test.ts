import { pointronDboDefinitions } from "./pointron.dbo";

runTest();

function runTest() {
  const dbo = ["fn::pointron::analytics::focusByCurrentHorizon::v3"];
  let definitions: any[] = [];
  dbo.forEach((item) => {
    const def = pointronDboDefinitions[item];
    // console.log({ def });
    definitions = [...definitions, ...def];
  });
  definitions = definitions.filter((x) => x).map((x) => x.replaceAll("\n", ""));
  console.log({ definitions });
}
