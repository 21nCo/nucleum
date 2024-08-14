export const memotronTables = [...nodesByDay()];

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
DEFINE FIELD notes on TABLE node FLEXIBLE TYPE option<object | string>;`;
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
