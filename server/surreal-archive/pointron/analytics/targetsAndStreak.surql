-- Created : DBCL-14
-- Usage: Db functions
DEFINE FUNCTION fn::pointron::analytics::targetsAndStreak::v2() {
  let $targets = return fn::pointron::analytics::targets::v3();
  RETURN IF $targets is none or array::len($targets) < 1 {
      RETURN [];
    } ELSE {
          RETURN (select fn::pointron::analytics::streak(scale) as streak, scale, target * 60 * 60 as target, actual, actual / (target * 60 * 60) >= 1 as isCurrentAchieved  from $targets);
    }
};


-- Created: DBCL-10
DEFINE FUNCTION fn::pointron::analytics::targetsAndStreak() {
  let $targets = return fn::pointron::analytics::targets::v2();
  RETURN IF $targets is none or array::len($targets) < 1 {
      RETURN [];
    } ELSE {
          RETURN (select fn::pointron::analytics::streak(scale) as streak, scale, target * 60 * 60 as target, actual, actual / (target * 60 * 60) >= 1 as isCurrentAchieved  from $targets);
    }
};