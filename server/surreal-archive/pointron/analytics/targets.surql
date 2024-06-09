
-- Created DBCL-14
-- Usage: Client, Db functions
DEFINE FUNCTION fn::pointron::analytics::targets::v3() {
  let $targets = array::first(select value horizonTargets from kv:pointronPreferences);
  RETURN IF $targets is none or array::len($targets) < 1 {
      RETURN [];
    } ELSE {
      RETURN SELECT fn::pointron::analytics::focusByCurrentHorizon::v3(scale, PointGoal:none).focus as actual, scale, target from $targets;
    }
};


-- Modified: DBCL-10
DEFINE FUNCTION fn::pointron::analytics::targets::v2() {
  let $targets = array::first(select value horizonTargets from Preferences:pointron);
  RETURN IF $targets is none or array::len($targets) < 1 {
      RETURN [];
    } ELSE {
      RETURN SELECT fn::pointron::analytics::focusByCurrentHorizon::v2(scale, PointGoal:none) as actual, scale, target from $targets;
    }
};




DEFINE FUNCTION fn::pointron::analytics::targets() {
  let $targets = array::first(select value horizonTargets from Preferences:pointron);
  RETURN IF $targets is none or array::len($targets) < 1 {
      RETURN [];
    } ELSE {
          RETURN (select fn::pointron::analytics::focusByCurrentHorizon(scale, PointGoal:none) as actual, scale, target from $targets)
    }
};