
-- Not used in client yet
-- Modified: DBCL-14
-- Created: DBCL-10
DEFINE FUNCTION fn::pointron::journal::dashboard($params: array, $byTags: bool){
  let $targetsAndStreak = return fn::pointron::analytics::targetsAndStreak::v2();
  return { horizons: $horizons, targetsAndStreak: $targetsAndStreak};
}