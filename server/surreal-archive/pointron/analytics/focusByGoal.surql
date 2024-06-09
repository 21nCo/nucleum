-- Created: DBCL-10
DEFINE FUNCTION fn::pointron::analytics::focusByGoal::v3($scale: string, $begin: datetime, $end: datetime, $goal: option<record>) {
  let $scaleSurreal = string::slice(string::lowercase($scale),0,-1);
  let $subGoals = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, time::group(start,$scaleSurreal) as start, goalId, goalId.label as goal, array::first(parent).label as topLevelGoal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and ($goal in parent or $goal is none) group by goalId, goal, topLevelGoal, start;
  let $topLevelGoals = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, time::group(start,$scaleSurreal) as start, goalId, goalId.label as goal, goalId.label as topLevelGoal from PointAggFocusByGoal where (parent is none or array::len(parent) = 0) and start >= $begin and start <= $end and (goalId is $goal or $goal is none) group by goal, goalId, topLevelGoal, start;
  let $currentGoalIfNotTopLevel = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, time::group(start,$scaleSurreal) as start,goalId, goalId.label as goal, array::first(parent).label as topLevelGoal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and goalId is $goal group by goal, goalId, topLevelGoal,  start;
  return array::concat($subGoals, $topLevelGoals, $currentGoalIfNotTopLevel);
};







-- Deprecated: DBCL-10
DEFINE FUNCTION fn::pointron::analytics::focusByGoal::v2($scale: string, $begin: datetime, $end: datetime, $goal: option<record>) {
  RETURN IF $scale = 'DAYS' {
      let $subGoals = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, day, time::group(start,'day') as start, goalId, goalId.label as goal, array::first(parent).label as topLevelGoal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and ($goal in parent or $goal is none) group by day, goalId, goal, topLevelGoal, start;
      let $topLevelGoals = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, day, time::group(start,'day') as start, goalId, goalId.label as goal, goalId.label as topLevelGoal from PointAggFocusByGoal where (parent is none or array::len(parent) = 0) and start >= $begin and start <= $end and (goalId is $goal or $goal is none) group by day, goal, goalId, topLevelGoal, start;
      let $currentGoalIfNotTopLevel = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, day, time::group(start,'day') as start,goalId, goalId.label as goal, array::first(parent).label as topLevelGoal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and goalId is $goal group by day, goal, goalId, topLevelGoal,  start;
      return array::concat($subGoals, $topLevelGoals, $currentGoalIfNotTopLevel);
      }
  ELSE IF $scale = 'MONTHS' {
      let $subGoals = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, month, time::group(start,'month') as start, goalId, goalId.label as goal, array::first(parent).label as topLevelGoal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and ($goal in parent or $goal is none) group by month, goalId, goal, topLevelGoal, start;
      let $topLevelGoals = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, month, time::group(start,'month') as start, goalId, goalId.label as goal, goalId.label as topLevelGoal from PointAggFocusByGoal where (parent is none or array::len(parent) = 0) and start >= $begin and start <= $end and (goalId is $goal or $goal is none) group by month, goal, goalId, topLevelGoal, start;
      let $currentGoalIfNotTopLevel = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, month, time::group(start,'month') as start,goalId, goalId.label as goal, array::first(parent).label as topLevelGoal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and goalId is $goal group by month, goal, goalId, topLevelGoal,  start;
      return array::concat($subGoals, $topLevelGoals, $currentGoalIfNotTopLevel);
      }
  ELSE IF $scale = 'YEARS' {
      let $subGoals = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, year, time::group(start,'year') as start, goalId, goalId.label as goal, array::first(parent).label as topLevelGoal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and ($goal in parent or $goal is none) group by year, goalId, goal, topLevelGoal, start;
      let $topLevelGoals = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, year, time::group(start,'year') as start, goalId, goalId.label as goal, goalId.label as topLevelGoal from PointAggFocusByGoal where (parent is none or array::len(parent) = 0) and start >= $begin and start <= $end and (goalId is $goal or $goal is none) group by year, goal, goalId, topLevelGoal, start;
      let $currentGoalIfNotTopLevel = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, year, time::group(start,'year') as start,goalId, goalId.label as goal, array::first(parent).label as topLevelGoal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and goalId is $goal group by year, goal, goalId, topLevelGoal,  start;
      return array::concat($subGoals, $topLevelGoals, $currentGoalIfNotTopLevel);
  }
};









#Deprecated - DBCL-10
DEFINE FUNCTION fn::pointron::analytics::focusByGoal($scale: string, $begin: datetime, $end: datetime, $goalId: record) {
    let $goal = array::first(select value label from $goalId);
  RETURN IF $scale = 'DAYS' {
      let $subgoalsFocus = select math::sum(totalFocus) as focus, day, time::group(start,'day') as start, $goal as goal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and array::find_index(parent, $goalId) is not none group by day, goal, start;
      let $selfFocus = select math::sum(totalFocus) as focus, day, time::group(start,'day') as start, goalId.label as goal from PointAggFocusByGoal where start >= $begin and start <= $end and goalId is $goalId group by day, goal, start;
      return array::concat($subgoalsFocus,$selfFocus);
      }
  ELSE IF $scale = 'MONTHS' {
      let $subgoalsFocus = select math::sum(totalFocus) as focus, month, time::group(start,'month') as start, $goal as goal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and array::find_index(parent, $goalId) is not none group by month, goal, start; 
      let $selfFocus = select math::sum(totalFocus) as focus, month, time::group(start,'month') as start, goalId.label as goal from PointAggFocusByGoal where start >= $begin and start <= $end and goalId is $goalId group by month, goal, start;
      return array::concat($subgoalsFocus,$selfFocus);
      }
  ELSE IF $scale = 'YEARS' {
    let $subgoalsFocus = select math::sum(totalFocus) as focus, year, time::group(start,'year') as start, $goal as goal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and array::find_index(parent, $goalId) is not none group by year, goal, start;
      let $selfFocus = select math::sum(totalFocus) as focus, year, time::group(start,'year') as start, goalId.label as goal from PointAggFocusByGoal where start >= $begin and start <= $end and goalId is $goalId group by year, goal, start;
      RETURN array::concat($subgoalsFocus,$selfFocus);
  }
};