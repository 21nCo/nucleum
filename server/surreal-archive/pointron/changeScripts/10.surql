-- DBCL-10
DEFINE FUNCTION fn::pointron::script::10(){
  let $targets = array::first(select value horizonTargets from Preferences:pointron);
  insert into PointTarget select scale, time::now() as timestamp, target from $targets;
  insert into PointTarget select scale, time::now() - 1m as timestamp, target from $targets;
  insert into PointTarget select scale, time::now() - 1y as timestamp, target from $targets;
}