export const pointronTables = [...sessionLog(), ...sessionLogIndices()];

function sessionLog() {
  const def = `DEFINE TABLE IF NOT EXISTS sessionLog SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS createdBy on TABLE sessionLog TYPE option<record<user>>;
DEFINE FIELD IF NOT EXISTS modifiedBy on TABLE sessionLog TYPE option<record<user>>;
DEFINE FIELD IF NOT EXISTS createdAt on TABLE sessionLog TYPE datetime;
DEFINE FIELD IF NOT EXISTS modifiedAt on TABLE sessionLog TYPE datetime;
DEFINE FIELD IF NOT EXISTS start on TABLE sessionLog TYPE datetime;
DEFINE FIELD IF NOT EXISTS end on TABLE sessionLog TYPE datetime;
DEFINE FIELD IF NOT EXISTS focus on TABLE sessionLog TYPE number;
DEFINE FIELD IF NOT EXISTS breakTime on TABLE sessionLog TYPE number;
DEFINE FIELD IF NOT EXISTS goalId on TABLE sessionLog TYPE option<record<goal>>;
DEFINE FIELD IF NOT EXISTS sessionId on TABLE sessionLog TYPE option<record<session>>;
`;
  return [def];
}

function sessionLogIndices() {
  const def = `DEFINE INDEX IF NOT EXISTS sessionLogIndex ON TABLE sessionLog COLUMNS start;`;
  return [def];
}

function pointLog() {
  const def = `DEFINE TABLE PointLog SCHEMALESS;`;
  return [def];
}

function pointLogTransformed() {
  const def = `DEFINE TABLE PointLogTransformed TYPE ANY SCHEMALESS AS SELECT count() AS total, goalId, fn::user::time::date::v4(start) AS start, time::day(fn::user::time::date::v4(start)) AS day, time::month(fn::user::time::date::v4(start)) AS month, time::year(fn::user::time::date::v4(start)) AS year, totalFocus AS focus, totalBreak AS brek, goalId, goalId.parent AS parent FROM PointLog PERMISSIONS NONE;`;
  return [...pointLog(), def];
}

function pointAggFocusByGoal() {
  const def = `DEFINE TABLE PointAggFocusByGoal SCHEMALESS AS SELECT count() AS entries, time::group(start, 'day') AS start, day, month, year, math::sum(focus) AS totalFocus, math::sum(brek) AS totalBreak, goalId, parent FROM PointLogTransformed GROUP BY goalId, day, month, year;`;
  return [...pointLogTransformed(), def];
}

function pointAggFocusByDay() {
  const def = `DEFINE TABLE PointAggFocusByDay AS SELECT count() as entries,start, time::group(start,'month') as monthAsDate, day,month, year, math::sum(totalFocus) AS totalFocus, math::sum(totalBreak) AS totalBreak FROM PointAggFocusByGoal GROUP BY start,day,month,year;`;
  return [...pointAggFocusByGoal(), def];
}

function pointAggFocusByMonth() {
  const def = `DEFINE TABLE PointAggFocusByMonth AS SELECT count() as entries, monthAsDate as start, time::group(start,'year') as yearAsDate, month, year, math::sum(totalFocus) AS totalFocus, math::sum(totalBreak) AS totalBreak FROM PointAggFocusByDay GROUP BY monthAsDate, month,year;`;
  return [...pointAggFocusByDay(), def];
}

function pointAggFocusByYear() {
  const def = `DEFINE TABLE PointAggFocusByYear AS SELECT count() as entries, yearAsDate as start, year, math::sum(totalFocus) AS totalFocus, math::sum(totalBreak) AS totalBreak FROM PointAggFocusByMonth GROUP BY yearAsDate,year;`;
  return [...pointAggFocusByMonth(), def];
}
