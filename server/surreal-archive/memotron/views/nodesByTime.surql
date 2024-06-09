DEFINE TABLE nodesByTime AS
SELECT count() AS total,fn::user::time::date::v3(created) as created, time::day(fn::user::time::date::v3(created)) AS day,
time::month(fn::user::time::date::v3(created)) AS month,
time::year(fn::user::time::date::v3(created)) AS year
FROM node;



-- Previous version
DEFINE TABLE nodesByTime AS
SELECT count() AS total, fn::user::time::date::v2(created, tzOffset) AS created, time::day(fn::user::time::date::v2(created, tzOffset)) AS day, time::month(fn::user::time::date::v2(created, tzOffset)) AS month, time::year(fn::user::time::date::v2(created, tzOffset)) AS year FROM node;