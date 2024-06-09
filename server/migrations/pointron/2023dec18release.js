const { performRootQuery } = require("../../surrealREST");

async function run() {
  const response = await performRootQuery(
    "select value meta::id(id) from user"
  );
  console.log({ response, users: response[0].result });
  const userIds = response[0].result;
  for (const userId of userIds) {
    const res = await runTokenDefinition(userId);
    console.log({ res });
  }
}

async function runTokenDefinition(userId) {
  console.log("running token def for: ", { userId });
  const query = `USE NAMESPACE ${process.env.USER_NS}; USE DATABASE ${userId}; DEFINE TOKEN ${process.env.TIDY_TOKEN_KEY} ON DB TYPE RS384 VALUE "${process.env.TOKEN_PUBLIC_KEY}";`;
  const dbCreationResponse = await performRootQuery(query);
  return dbCreationResponse;
}

module.exports = {
  run: run,
};
