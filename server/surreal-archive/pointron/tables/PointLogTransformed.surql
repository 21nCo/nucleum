DEFINE TABLE PointLogTransformed AS 
SELECT count() AS total, goalId, fn::user::time::date::v2(start, tzOffset) as start, time::day(fn::user::time::date::v2(start, tzOffset)) AS day,
time::month(fn::user::time::date::v2(start, tzOffset)) AS month,
time::year(fn::user::time::date::v2(start, tzOffset)) AS year, 
totalFocus as focus, totalBreak as brek, goalId, goalId.parent as parent FROM PointLog;