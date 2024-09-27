export const memotronTables = [
  ...nodesByDay(),
  ...collection(),
  ...nodeIndices(),
  ...collectionIndices(),
  ...vector()
];

function node() {
  const def = `DEFINE TABLE node SCHEMAFULL;
DEFINE FIELD label on TABLE node TYPE option<string>;
DEFINE FIELD body on TABLE node FLEXIBLE TYPE option<object | string>; 
DEFINE FIELD parent on TABLE node TYPE option<record<node>>;
DEFINE FIELD children on TABLE node TYPE option<array<record<node>>>;
DEFINE FIELD contentType on TABLE node TYPE string;
DEFINE FIELD url on TABLE node TYPE option<string>;
DEFINE FIELD file on TABLE node TYPE option<record<file>>;
DEFINE FIELD properties on TABLE node FLEXIBLE TYPE option<array<object>>;
DEFINE FIELD metadata on TABLE node FLEXIBLE TYPE option<object>;
DEFINE FIELD urlParts on TABLE node FLEXIBLE TYPE option<object>;
DEFINE FIELD trashInformation on TABLE node FLEXIBLE TYPE option<object>;
DEFINE FIELD createdBy on TABLE node TYPE option<record<user>>;
DEFINE FIELD modifiedBy on TABLE node TYPE option<record<user>>;
DEFINE FIELD createdAt on TABLE node TYPE datetime;
DEFINE FIELD modifiedAt on TABLE node TYPE datetime;
DEFINE FIELD isArchived on TABLE node DEFAULT false;
DEFINE FIELD isStarred on TABLE node DEFAULT false;
DEFINE FIELD creationContext on TABLE node TYPE any;
DEFINE FIELD notes on TABLE node FLEXIBLE TYPE option<object | string>;
DEFINE FIELD mdText on TABLE node FLEXIBLE TYPE option<string>;
DEFINE FIELD vector on TABLE node TYPE option<record<vector> | null>;
`;
  return [def];
}

//TODO- while deleting a node make sure to delete its vector as well important* lese retrieved data can be pointing to undefined or null causing issues in node display and casuing stopdown
function vector() {
  const def = `DEFINE TABLE vector SCHEMAFULL;
DEFINE FIELD createdBy on TABLE vector TYPE option<record<user>>;
DEFINE FIELD modifiedBy on TABLE vector TYPE option<record<user>>;
DEFINE FIELD createdAt on TABLE vector TYPE datetime;
DEFINE FIELD modifiedAt on TABLE vector TYPE datetime;
DEFINE FIELD interactedAt on TABLE vector TYPE datetime;
DEFINE FIELD embedding on TABLE vector TYPE array<float>;
DEFINE FIELD node on TABLE vector TYPE option<record<node>>;
DEFINE INDEX nodeSemanticSearchIndex ON TABLE vector FIELDS embedding MTREE DIMENSION 768 DIST COSINE TYPE F32;
`;
  return [def];
}
/**
 * 
 * Note: Combining multiple columns in single Index is not working as expected
 * ->     "surrealdb": "^1.0.0-beta.21",
    "surrealdb.js": "^1.0.0-beta.9",
    "surrealdb.wasm": "^1.0.0-beta.15",
 * 
 * @returns 
 */
function nodeIndices() {
  const def = `DEFINE INDEX nodetextSearchIndex ON TABLE node COLUMNS body SEARCH ANALYZER ascii HIGHLIGHTS;`;
  const label = `DEFINE INDEX nodetextSearchIndexLabel ON TABLE node COLUMNS label SEARCH ANALYZER ascii HIGHLIGHTS;`;
  // const def2 = `DEFINE INDEX nodeSemanticSearchIndex ON TABLE vector FIELDS vector MTREE DIMENSION 768 DIST COSINE TYPE F32;`;
  return [def, label]; //, def2];
}

function nodesByTime() {
  const def = `DEFINE TABLE nodesByTime SCHEMALESS AS SELECT count() AS total, fn::user::time::date::v4(createdAt) AS createdAt, 
time::day(fn::user::time::date::v4(createdAt)) AS day, time::month(fn::user::time::date::v4(createdAt)) AS month, 
time::year(fn::user::time::date::v4(createdAt)) AS year FROM node PERMISSIONS NONE;`;
  return [...node(), def];
}

function nodesByDay() {
  const def = `DEFINE TABLE nodesByDay SCHEMALESS AS SELECT count() AS entries, time::group(createdAt, 'day') AS createdAt, 
day, month, year FROM nodesByTime GROUP BY day, month, year PERMISSIONS NONE`;
  return [...nodesByTime(), def];
}

function collection() {
  const def = `DEFINE TABLE collection SCHEMAFULL;
  DEFINE FIELD label on TABLE collection TYPE option<string>;
  DEFINE FIELD type on TABLE collection TYPE string;
  DEFINE FIELD cover on TABLE collection TYPE option<string | record<file>>;
  DEFINE FIELD coverLayout on TABLE collection FLEXIBLE TYPE option<object>;
  DEFINE FIELD description on TABLE collection TYPE option<string>;
  DEFINE FIELD views on TABLE collection TYPE option<array<record<view>>>;
  DEFINE FIELD isCaptureShortcutEnabled on TABLE collection DEFAULT false;
  DEFINE FIELD typeToExtend on TABLE collection TYPE option<string>;
  DEFINE FIELD avatar on TABLE collection TYPE option<object | string>;
  DEFINE FIELD query on TABLE collection TYPE option<string>;
  DEFINE FIELD properties on TABLE collection TYPE option<array<record<property>>>;
  DEFINE FIELD trashInformation on TABLE collection FLEXIBLE TYPE option<object>;
  DEFINE FIELD createdBy on TABLE collection TYPE option<record<user>>;
  DEFINE FIELD modifiedBy on TABLE collection TYPE option<record<user>>;
  DEFINE FIELD createdAt on TABLE collection TYPE datetime;
  DEFINE FIELD modifiedAt on TABLE collection TYPE datetime;
  DEFINE FIELD isArchived on TABLE collection DEFAULT false;
  DEFINE FIELD isStarred on TABLE collection DEFAULT false;
`;
  return [def];
}

function collectionIndices() {
  const def = `DEFINE INDEX collectionLabelSearchIndex ON TABLE collection COLUMNS label SEARCH ANALYZER ascii HIGHLIGHTS;`;
  const typeIndex = `DEFINE INDEX fileTypeSearchIndex ON TABLE file COLUMNS type SEARCH ANALYZER ascii;`;
  return [def, typeIndex];
}
