
-- Deprecated - formed as ::targetsAndStreak() - DBCL-10
  DEFINE FUNCTION fn::pointron::analytics::allStreaks() {
    let $targets = array::first(select value horizonTargets from Preferences:pointron);
    RETURN IF $targets is none or array::len($targets) < 1 {
        RETURN [];
      } ELSE {
            RETURN (select fn::pointron::analytics::streak(scale) as streak, scale, target from $targets)
      }
  };
