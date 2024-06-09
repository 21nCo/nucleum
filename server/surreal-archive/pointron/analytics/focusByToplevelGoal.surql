#Deprecated - DBCL-10 - merged functionality into focusByGoal::v2

DEFINE FUNCTION fn::pointron::analytics::focusByTopLevelGoal($scale: string, $begin: datetime, $end: datetime, $goals: array) {
  RETURN IF $scale = 'DAYS' {
      let $subgoalsFocus = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, day, time::group(start,'day') as start, array::first(parent).label as goal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and (array::first(parent).id in $goals or array::len($goals) = 0) group by day, goal, start; 
      let $selfFocus = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, day, time::group(start,'day') as start, goalId.label as goal from PointAggFocusByGoal where (parent is none or array::len(parent) = 0) and start >= $begin and start <= $end and (goalId in $goals or array::len($goals) = 0) group by day, goal, start;
      return array::concat($subgoalsFocus,$selfFocus);
      }
  ELSE IF $scale = 'MONTHS' {
      let $subgoalsFocus = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, month, time::group(start,'month') as start, array::first(parent).label as goal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and (array::first(parent).id in $goals or array::len($goals) = 0) group by month, goal, start; 
      let $selfFocus = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, month, time::group(start,'month') as start, goalId.label as goal from PointAggFocusByGoal where (parent is none or array::len(parent) = 0) and start >= $begin and start <= $end  and (goalId in $goals or array::len($goals) = 0) group by month, goal, start;
      return array::concat($subgoalsFocus,$selfFocus);
      }
  ELSE IF $scale = 'YEARS' {
    let $subgoalsFocus = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, year, time::group(start,'year') as start, array::first(parent).label as goal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and (array::first(parent).id in $goals or array::len($goals) = 0) group by year, goal, start;
      let $selfFocus = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, year, time::group(start,'year') as start, goalId.label as goal from PointAggFocusByGoal where (parent is none or array::len(parent) = 0) and start >= $begin and start <= $end  and (goalId in $goals or array::len($goals) = 0) group by year, goal, start;
      RETURN array::concat($subgoalsFocus,$selfFocus);
  }
};