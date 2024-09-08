export const memotronTables = [...nodesByDay(), ...collection()];

function node() {
  const def = `DEFINE TABLE node SCHEMAFULL;
DEFINE FIELD label on TABLE node TYPE option<string>;
DEFINE FIELD body on TABLE node FLEXIBLE TYPE option<object | string>;
DEFINE FIELD type on TABLE node TYPE option<record<type>>;
DEFINE FIELD parent on TABLE node TYPE option<record<node>>;
DEFINE FIELD children on TABLE node TYPE option<array<record<node>>>;
DEFINE FIELD contentType on TABLE node TYPE string;
DEFINE FIELD contentHash on TABLE node TYPE option<string>;
DEFINE FIELD url on TABLE node TYPE option<string>;
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
DEFINE INDEX nodetextSearchIndex ON TABLE node COLUMNS label, body SEARCH ANALYZER ascii BM25 HIGHLIGHTS;
DEFINE ANALYZER ascii TOKENIZERS class FILTERS lowercase,ascii;
`;
  return [def];
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
  DEFINE INDEX collectionTextSearchIndex ON TABLE collection COLUMNS label SEARCH ANALYZER ascii BM25 HIGHLIGHTS;
`;
  return [def];
}
