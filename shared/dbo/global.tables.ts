export const globalTables = [
  ...searchIndexSimpleAnalyser(),
  ...searchIndexAsciiAnalyser()
];

function searchIndexAsciiAnalyser() {
  const def = `DEFINE ANALYZER ascii TOKENIZERS class FILTERS lowercase,ascii,edgengram(1,100),snowball(english);`;
  return [def];
}

function searchIndexSimpleAnalyser() {
  const def = `DEFINE ANALYZER simple TOKENIZERS blank FILTERS lowercase;`;
  return [def];
}
