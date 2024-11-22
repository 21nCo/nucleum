import { userDatev4 } from "./global.dbo";

export const memotronTables = [
  // ...nodesByDay(),
  ...collection(),
  ...linkTag(),
  ...node(),
  ...nodeIndices(),
  ...collectionIndices(),
  ...linkTagIndices(),
  ...vector()
];

function node() {
  const def = `DEFINE TABLE IF NOT EXISTS node TYPE ANY SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS label on TABLE node TYPE option<string>;
DEFINE FIELD IF NOT EXISTS body on TABLE node FLEXIBLE TYPE option<object | string>; 
DEFINE FIELD IF NOT EXISTS parent on TABLE node TYPE option<record<node>>;
DEFINE FIELD IF NOT EXISTS children on TABLE node TYPE option<array<record<node>>>;
DEFINE FIELD IF NOT EXISTS contentType on TABLE node TYPE string;
DEFINE FIELD IF NOT EXISTS url on TABLE node TYPE option<string>;
DEFINE FIELD IF NOT EXISTS file on TABLE node TYPE option<record<file>>;
DEFINE FIELD IF NOT EXISTS properties on TABLE node FLEXIBLE TYPE option<array<object>>;
DEFINE FIELD IF NOT EXISTS metadata on TABLE node FLEXIBLE TYPE option<object>;
DEFINE FIELD IF NOT EXISTS urlParts on TABLE node FLEXIBLE TYPE option<object>;
DEFINE FIELD IF NOT EXISTS trashInformation on TABLE node FLEXIBLE TYPE option<object>;
DEFINE FIELD IF NOT EXISTS createdBy on TABLE node TYPE option<record<user>>;
DEFINE FIELD IF NOT EXISTS modifiedBy on TABLE node TYPE option<record<user>>;
DEFINE FIELD IF NOT EXISTS createdAt on TABLE node TYPE datetime;
DEFINE FIELD IF NOT EXISTS modifiedAt on TABLE node TYPE datetime;
DEFINE FIELD IF NOT EXISTS isArchived on TABLE node DEFAULT false;
DEFINE FIELD IF NOT EXISTS isStarred on TABLE node DEFAULT false;
DEFINE FIELD IF NOT EXISTS creationContext on TABLE node TYPE option<record<node>>;
DEFINE FIELD IF NOT EXISTS notes on TABLE node FLEXIBLE TYPE option<object | string>;
DEFINE FIELD IF NOT EXISTS mdText on TABLE node FLEXIBLE TYPE option<string>;
DEFINE FIELD IF NOT EXISTS vector on TABLE node TYPE option<record<vector> | null>;
DEFINE FIELD OVERWRITE avatar on TABLE node FLEXIBLE TYPE option<array | object | string>;
DEFINE FIELD IF NOT EXISTS text on TABLE node TYPE option<string>;
`;
  return [def];
}

//TODO- while deleting a node make sure to delete its vector as well important* lese retrieved data can be pointing to undefined or null causing issues in node display and casuing stopdown
function vector() {
  const def = `DEFINE TABLE IF NOT EXISTS vector SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS createdBy on TABLE vector TYPE option<record<user>>;
DEFINE FIELD IF NOT EXISTS modifiedBy on TABLE vector TYPE option<record<user>>;
DEFINE FIELD IF NOT EXISTS createdAt on TABLE vector TYPE datetime;
DEFINE FIELD IF NOT EXISTS modifiedAt on TABLE vector TYPE datetime;
DEFINE FIELD IF NOT EXISTS embedding on TABLE vector TYPE array<float>;
DEFINE FIELD IF NOT EXISTS node on TABLE vector TYPE option<record<node>>;
DEFINE INDEX IF NOT EXISTS nodeSemanticSearchIndex ON TABLE vector FIELDS embedding MTREE DIMENSION 768 DIST COSINE TYPE F32;
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
  const body = `DEFINE INDEX IF NOT EXISTS nodetextSearchIndex ON TABLE node COLUMNS mdText SEARCH ANALYZER ascii HIGHLIGHTS;`;
  const label = `DEFINE INDEX IF NOT EXISTS nodetextSearchIndexLabel ON TABLE node COLUMNS label SEARCH ANALYZER ascii HIGHLIGHTS;`;
  const text = `DEFINE INDEX IF NOT EXISTS nodetextSearchIndexTwo ON TABLE node COLUMNS text SEARCH ANALYZER ascii HIGHLIGHTS;`;
  const deleteTextIndex = `REMOVE INDEX IF EXISTS nodetextSearchIndexTwo ON TABLE node;`;
  const deleteBodyIndex = `REMOVE INDEX IF EXISTS nodetextSearchIndex ON TABLE node;`;
  const deleteLabelIndex = `REMOVE INDEX IF EXISTS nodetextSearchIndexLabel ON TABLE node;`;
  // const def2 = `DEFINE INDEX nodeSemanticSearchIndex ON TABLE vector FIELDS vector MTREE DIMENSION 768 DIST COSINE TYPE F32;`;
  return [deleteTextIndex, deleteBodyIndex, deleteLabelIndex]; //, def2];
}

function nodesByTime() {
  const def = `DEFINE TABLE IF NOT EXISTS nodesByTime SCHEMALESS AS SELECT count() AS total, fn::user::time::date::v4(createdAt) AS createdAt, 
time::day(fn::user::time::date::v4(createdAt)) AS day, time::month(fn::user::time::date::v4(createdAt)) AS month, 
time::year(fn::user::time::date::v4(createdAt)) AS year FROM node PERMISSIONS NONE;`;
  return [...userDatev4(), def];
}

function nodesByDay() {
  const def = `DEFINE TABLE IF NOT EXISTS nodesByDay SCHEMALESS AS SELECT count() AS entries, time::group(createdAt, 'day') AS createdAt, 
day, month, year FROM nodesByTime GROUP BY day, month, year PERMISSIONS NONE`;
  return [...nodesByTime(), def];
}

function collection() {
  const def = `DEFINE TABLE IF NOT EXISTS collection SCHEMAFULL;
  DEFINE FIELD IF NOT EXISTS label on TABLE collection TYPE option<string>;
  DEFINE FIELD IF NOT EXISTS type on TABLE collection TYPE string;
  DEFINE FIELD IF NOT EXISTS cover on TABLE collection TYPE option<string | record<file>>;
  DEFINE FIELD IF NOT EXISTS coverLayout on TABLE collection FLEXIBLE TYPE option<object>;
  DEFINE FIELD IF NOT EXISTS description on TABLE collection TYPE option<string>;
  DEFINE FIELD IF NOT EXISTS views on TABLE collection TYPE option<array<record<view>>>;
  DEFINE FIELD IF NOT EXISTS isCaptureShortcutEnabled on TABLE collection DEFAULT false;
  DEFINE FIELD IF NOT EXISTS typeToExtend on TABLE collection TYPE option<record<collection>>;
  DEFINE FIELD IF NOT EXISTS avatar on TABLE collection FLEXIBLE TYPE option<object | string>;
  DEFINE FIELD IF NOT EXISTS query on TABLE collection TYPE option<string>;
  DEFINE FIELD IF NOT EXISTS properties on TABLE collection TYPE option<array<record<property>>>;
  DEFINE FIELD IF NOT EXISTS trashInformation on TABLE collection FLEXIBLE TYPE option<object>;
  DEFINE FIELD IF NOT EXISTS createdBy on TABLE collection TYPE option<record<user>>;
  DEFINE FIELD IF NOT EXISTS modifiedBy on TABLE collection TYPE option<record<user>>;
  DEFINE FIELD IF NOT EXISTS createdAt on TABLE collection TYPE datetime;
  DEFINE FIELD IF NOT EXISTS modifiedAt on TABLE collection TYPE datetime;
  DEFINE FIELD IF NOT EXISTS isArchived on TABLE collection DEFAULT false;
  DEFINE FIELD IF NOT EXISTS isStarred on TABLE collection DEFAULT false;
`;
  return [def];
}

function collectionIndices() {
  const def = `DEFINE INDEX IF NOT EXISTS collectionLabelSearchIndex ON TABLE collection COLUMNS label SEARCH ANALYZER ascii HIGHLIGHTS;`;
  const typeIndex = `DEFINE INDEX IF NOT EXISTS fileTypeSearchIndex ON TABLE file COLUMNS type SEARCH ANALYZER ascii;`;
  return [def, typeIndex];
}

function linkTag() {
  const def = `DEFINE TABLE IF NOT EXISTS linkTag SCHEMAFULL;
  DEFINE FIELD IF NOT EXISTS label on TABLE linkTag TYPE string;
  DEFINE FIELD IF NOT EXISTS group on TABLE linkTag TYPE option<string>;
  DEFINE FIELD IF NOT EXISTS createdBy on TABLE linkTag TYPE option<record<user>>;
  DEFINE FIELD IF NOT EXISTS modifiedBy on TABLE linkTag TYPE option<record<user>>;
  DEFINE FIELD IF NOT EXISTS createdAt on TABLE linkTag TYPE datetime;
  DEFINE FIELD IF NOT EXISTS modifiedAt on TABLE linkTag TYPE datetime;`;
  return [def];
}

function linkTagIndices() {
  const def = `DEFINE INDEX IF NOT EXISTS linkTagLabelSearchIndex ON TABLE linkTag COLUMNS label SEARCH ANALYZER ascii HIGHLIGHTS;`;
  return [def];
}
