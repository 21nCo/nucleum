-- Created : DBCL-14
-- Usage: Client
DEFINE FUNCTION fn::pointron::analytics::fetch::v2($params: array, $byTags: bool){
  let $horizons = return fn::pointron::analytics::horizons::v3($params, $byTags);
  let $targetsAndStreak = return fn::pointron::analytics::targetsAndStreak::v2();
  return { horizons: $horizons, targetsAndStreak: $targetsAndStreak};
};

-- Created: DBCL-10
DEFINE FUNCTION fn::pointron::analytics::fetch($params: array, $byTags: bool){
  let $horizons = return fn::pointron::analytics::horizons::v3($params, $byTags);
  let $targetsAndStreak = return fn::pointron::analytics::targetsAndStreak();
  return { horizons: $horizons, targetsAndStreak: $targetsAndStreak};
};